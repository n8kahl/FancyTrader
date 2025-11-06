import axios from 'axios';
import { DiscordAlert, DetectedSetup, OptionsContract } from '../types';
import { logger } from '../utils/logger';

export class DiscordService {
  private webhookUrl: string;
  private enabled: boolean;

  constructor() {
    this.webhookUrl = process.env.DISCORD_WEBHOOK_URL || '';
    this.enabled = process.env.DISCORD_ENABLED === 'true';

    if (!this.webhookUrl && this.enabled) {
      logger.warn('Discord webhook URL not configured. Alerts will be logged only.');
    }
  }

  /**
   * Send a Discord alert
   */
  async sendAlert(alert: DiscordAlert): Promise<void> {
    if (!this.enabled) {
      logger.debug('Discord alerts disabled');
      return;
    }

    const embed = this.createEmbed(alert);

    try {
      if (this.webhookUrl) {
        await axios.post(this.webhookUrl, {
          embeds: [embed],
          username: 'Fancy Trader Bot',
          avatar_url: 'https://i.imgur.com/4M34hi2.png' // Optional: Add bot avatar
        });
        
        logger.info(`Discord alert sent: ${alert.type} for ${alert.symbol}`);
      } else {
        logger.info(`[DISCORD] ${alert.type} - ${alert.symbol}: ${alert.message}`);
      }
    } catch (error: any) {
      logger.error('Failed to send Discord alert:', error.message);
    }
  }

  /**
   * Create Discord embed
   */
  private createEmbed(alert: DiscordAlert): any {
    const embed: any = {
      title: `${this.getEmojiForType(alert.type)} ${alert.type.replace(/_/g, ' ')}`,
      description: alert.message,
      color: this.getColorForType(alert.type),
      timestamp: new Date(alert.timestamp).toISOString(),
      fields: []
    };

    // Add symbol
    embed.fields.push({
      name: '📊 Symbol',
      value: alert.symbol,
      inline: true
    });

    // Add setup info if available
    if (alert.setup) {
      embed.fields.push({
        name: '🎯 Setup Type',
        value: alert.setup.setupType.replace(/_/g, ' '),
        inline: true
      });

      embed.fields.push({
        name: '📈 Direction',
        value: alert.setup.direction === 'LONG' ? '🟢 LONG' : '🔴 SHORT',
        inline: true
      });

      if (alert.setup.entryPrice) {
        embed.fields.push({
          name: '💰 Entry Price',
          value: `$${alert.setup.entryPrice.toFixed(2)}`,
          inline: true
        });
      }

      if (alert.setup.stopLoss) {
        embed.fields.push({
          name: '🛑 Stop Loss',
          value: `$${alert.setup.stopLoss.toFixed(2)}`,
          inline: true
        });
      }

      if (alert.setup.targets && alert.setup.targets.length > 0) {
        embed.fields.push({
          name: '🎯 Targets',
          value: alert.setup.targets.map((t, i) => `T${i + 1}: $${t.toFixed(2)}`).join('\n'),
          inline: true
        });
      }

      if (alert.setup.confluenceScore) {
        embed.fields.push({
          name: '⭐ Confluence Score',
          value: `${alert.setup.confluenceScore}/10`,
          inline: true
        });
      }

      // Add top confluence factors
      if (alert.setup.confluenceFactors && alert.setup.confluenceFactors.length > 0) {
        const factors = alert.setup.confluenceFactors
          .filter(f => f.present)
          .slice(0, 5)
          .map(f => `✓ ${f.factor}${f.value ? `: ${f.value}` : ''}`)
          .join('\n');

        embed.fields.push({
          name: '✅ Key Confluence',
          value: factors || 'None',
          inline: false
        });
      }
    }

    // Add contract info if available
    if (alert.contract) {
      embed.fields.push({
        name: '📜 Contract',
        value: `${alert.contract.strike}${alert.contract.type === 'CALL' ? 'C' : 'P'} ${alert.contract.expirationDisplay}`,
        inline: true
      });

      embed.fields.push({
        name: '💵 Premium',
        value: `$${alert.contract.premium.toFixed(2)}`,
        inline: true
      });

      if (alert.contract.delta) {
        embed.fields.push({
          name: 'Δ Delta',
          value: alert.contract.delta.toFixed(3),
          inline: true
        });
      }
    }

    // Add P/L if available
    if (alert.profitLoss !== undefined) {
      const plEmoji = alert.profitLoss >= 0 ? '📈' : '📉';
      embed.fields.push({
        name: `${plEmoji} Profit/Loss`,
        value: `$${alert.profitLoss.toFixed(2)} (${alert.profitLossPercent?.toFixed(1)}%)`,
        inline: true
      });
    }

    return embed;
  }

  /**
   * Get emoji for alert type
   */
  private getEmojiForType(type: string): string {
    const emojiMap: Record<string, string> = {
      'SETUP_ALERT': '🔔',
      'ENTRY_ALERT': '🚀',
      'TARGET_HIT': '🎯',
      'STOP_LOSS': '🛑',
      'PARTIAL_EXIT': '💰',
      'CLOSE_POSITION': '🏁',
      'CUSTOM': '📢'
    };

    return emojiMap[type] || '📊';
  }

  /**
   * Get color for alert type
   */
  private getColorForType(type: string): number {
    const colorMap: Record<string, number> = {
      'SETUP_ALERT': 0x3498db,    // Blue
      'ENTRY_ALERT': 0x2ecc71,     // Green
      'TARGET_HIT': 0xf39c12,      // Orange/Gold
      'STOP_LOSS': 0xe74c3c,       // Red
      'PARTIAL_EXIT': 0x9b59b6,    // Purple
      'CLOSE_POSITION': 0x95a5a6,  // Gray
      'CUSTOM': 0x34495e           // Dark Gray
    };

    return colorMap[type] || 0x7289da;
  }

  /**
   * Send setup detection alert
   */
  async sendSetupAlert(setup: DetectedSetup): Promise<void> {
    const message = `New ${setup.setupType.replace(/_/g, ' ')} setup detected on ${setup.symbol}`;

    const alert: DiscordAlert = {
      type: 'SETUP_ALERT',
      symbol: setup.symbol,
      message,
      setup,
      timestamp: Date.now()
    };

    await this.sendAlert(alert);
  }

  /**
   * Send entry confirmation alert
   */
  async sendEntryAlert(setup: DetectedSetup, contract?: OptionsContract): Promise<void> {
    const message = `Entered ${setup.direction} position on ${setup.symbol}`;

    const alert: DiscordAlert = {
      type: 'ENTRY_ALERT',
      symbol: setup.symbol,
      message,
      setup,
      contract,
      timestamp: Date.now()
    };

    await this.sendAlert(alert);
  }

  /**
   * Send target hit alert
   */
  async sendTargetHitAlert(
    setup: DetectedSetup, 
    targetIndex: number, 
    profitLoss?: number, 
    profitLossPercent?: number
  ): Promise<void> {
    const message = `Target ${targetIndex + 1} hit on ${setup.symbol}!`;

    const alert: DiscordAlert = {
      type: 'TARGET_HIT',
      symbol: setup.symbol,
      message,
      setup,
      profitLoss,
      profitLossPercent,
      timestamp: Date.now()
    };

    await this.sendAlert(alert);
  }

  /**
   * Send stop loss alert
   */
  async sendStopLossAlert(
    setup: DetectedSetup, 
    profitLoss?: number, 
    profitLossPercent?: number
  ): Promise<void> {
    const message = `Stop loss hit on ${setup.symbol}`;

    const alert: DiscordAlert = {
      type: 'STOP_LOSS',
      symbol: setup.symbol,
      message,
      setup,
      profitLoss,
      profitLossPercent,
      timestamp: Date.now()
    };

    await this.sendAlert(alert);
  }
}
