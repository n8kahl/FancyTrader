import { randomUUID } from "node:crypto";
import type { Trade as SharedTrade } from "@fancytrader/shared";
import { DiscordAlert, DetectedSetup, OptionsContract } from "../types";
import { logger } from "../utils/logger";
import { HttpError } from "../utils/httpError";

export interface DiscordField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  timestamp?: string;
  url?: string;
  fields?: DiscordField[];
  footer?: { text: string };
}

export interface BacktestShareSummary {
  winRate: number;
  totalR: number;
  maxDrawdownR: number;
  expectancyR: number;
  trades?: number;
  symbol?: string;
  strategy?: string;
}

export interface BacktestShareOptions {
  link?: string;
  note?: string;
  webhook?: string;
}

// TODO: mask PII / redact tokens before GA
export async function sendEmbed(embed: DiscordEmbed, webhook?: string): Promise<{ id: string }> {
  const envWebhook = process.env.DISCORD_WEBHOOK_URL;
  const url: string | undefined = webhook ?? envWebhook;
  if (!url) {
    throw new HttpError(400, "Missing Discord webhook URL", "DISCORD_WEBHOOK_MISSING");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (response.status === 429) {
    const retryAfterHeader = response.headers.get("retry-after") ?? "0";
    throw new HttpError(
      429,
      `Discord rate-limited. retry-after=${retryAfterHeader}s`,
      "DISCORD_RATE_LIMITED",
      { retryAfter: Number(retryAfterHeader) }
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new HttpError(
      response.status,
      `Discord webhook error: ${response.status} ${response.statusText}`,
      "DISCORD_WEBHOOK_ERROR",
      { body: body.slice(0, 500) }
    );
  }

  return { id: randomUUID() };
}

export class DiscordService {
  private webhookUrl: string;
  private enabled: boolean;

  constructor() {
    this.webhookUrl = process.env.DISCORD_WEBHOOK_URL || "";
    this.enabled = process.env.DISCORD_ENABLED === "true";

    if (!this.webhookUrl && this.enabled) {
      logger.warn("Discord webhook URL not configured. Alerts will be logged only.");
    }
  }

  async sendTradeShare(trade: SharedTrade, webhook?: string): Promise<{ id: string }> {
    const embed = this.buildTradeShareEmbed(trade);
    return sendEmbed(embed, webhook ?? this.webhookUrl);
  }

  async sendBacktestShare(summary: BacktestShareSummary, options?: BacktestShareOptions): Promise<{ id: string }> {
    const embed = this.buildBacktestShareEmbed(summary, options);
    return sendEmbed(embed, options?.webhook ?? this.webhookUrl);
  }

  /**
   * Send a Discord alert
   */
  async sendAlert(alert: DiscordAlert): Promise<void> {
    if (!this.enabled) {
      logger.debug("Discord alerts disabled");
      return;
    }

    const embed = this.createEmbed(alert);

    try {
      if (this.webhookUrl) {
        await sendEmbed(embed, this.webhookUrl);
        logger.info(`Discord alert sent: ${alert.type} for ${alert.symbol}`);
      } else {
        logger.info(`[DISCORD] ${alert.type} - ${alert.symbol}: ${alert.message}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Failed to send Discord alert", { error: message });
    }
  }

  /**
   * Create Discord embed
   */
  private createEmbed(alert: DiscordAlert): DiscordEmbed {
    const embed: DiscordEmbed = {
      title: `${this.getEmojiForType(alert.type)} ${alert.type.replace(/_/g, " ")}`,
      description: alert.message,
      color: this.getColorForType(alert.type),
      timestamp: new Date(alert.timestamp).toISOString(),
      fields: [],
    };

    embed.fields?.push({
      name: "📊 Symbol",
      value: alert.symbol,
      inline: true,
    });

    if (alert.setup) {
      embed.fields?.push(
        {
          name: "🎯 Setup Type",
          value: alert.setup.setupType.replace(/_/g, " "),
          inline: true,
        },
        {
          name: "📈 Direction",
          value: alert.setup.direction === "LONG" ? "🟢 LONG" : "🔴 SHORT",
          inline: true,
        }
      );

      if (alert.setup.entryPrice) {
        embed.fields?.push({
          name: "💰 Entry Price",
          value: `$${alert.setup.entryPrice.toFixed(2)}`,
          inline: true,
        });
      }

      if (alert.setup.stopLoss) {
        embed.fields?.push({
          name: "🛑 Stop Loss",
          value: `$${alert.setup.stopLoss.toFixed(2)}`,
          inline: true,
        });
      }

      if (alert.setup.targets && alert.setup.targets.length > 0) {
        embed.fields?.push({
          name: "🎯 Targets",
          value: alert.setup.targets.map((t, i) => `T${i + 1}: $${t.toFixed(2)}`).join("\n"),
          inline: true,
        });
      }

      if (alert.setup.confluenceScore) {
        embed.fields?.push({
          name: "⭐ Confluence Score",
          value: `${alert.setup.confluenceScore}/10`,
          inline: true,
        });
      }

      if (alert.setup.confluenceFactors && alert.setup.confluenceFactors.length > 0) {
        const factors = alert.setup.confluenceFactors
          .filter((f) => f.present)
          .slice(0, 5)
          .map((f) => `✓ ${f.factor}${f.value ? `: ${f.value}` : ""}`)
          .join("\n");

        embed.fields?.push({
          name: "✅ Key Confluence",
          value: factors || "None",
          inline: false,
        });
      }
    }

    if (alert.contract) {
      embed.fields?.push(
        {
          name: "📜 Contract",
          value: `${alert.contract.strike}${alert.contract.type === "CALL" ? "C" : "P"} ${alert.contract.expirationDisplay}`,
          inline: true,
        },
        {
          name: "💵 Premium",
          value: `$${alert.contract.premium.toFixed(2)}`,
          inline: true,
        }
      );

      if (alert.contract.delta) {
        embed.fields?.push({
          name: "Δ Delta",
          value: alert.contract.delta.toFixed(3),
          inline: true,
        });
      }
    }

    if (alert.profitLoss !== undefined) {
      const plEmoji = alert.profitLoss >= 0 ? "📈" : "📉";
      embed.fields?.push({
        name: `${plEmoji} Profit/Loss`,
        value: `$${alert.profitLoss.toFixed(2)} (${alert.profitLossPercent?.toFixed(1)}%)`,
        inline: true,
      });
    }

    return embed;
  }

  private buildTradeShareEmbed(trade: SharedTrade): DiscordEmbed {
    const direction = trade.direction === "SHORT" ? "SHORT" : "LONG";
    const entry = trade.entry ?? trade.entryPrice;
    const stop = trade.stop ?? trade.stopLoss;
    const targets = trade.targets ?? (trade.target ? [trade.target] : []);

    const embed: DiscordEmbed = {
      title: `${trade.symbol} ${direction} setup`,
      description: trade.setup,
      color: direction === "LONG" ? 0x2ecc71 : 0xe74c3c,
      timestamp: new Date().toISOString(),
      fields: [
        {
          name: "Entry / Stop",
          value: `${entry ? `$${entry.toFixed(2)}` : "--"} → ${stop ? `$${stop.toFixed(2)}` : "--"}`,
          inline: true,
        },
      ],
    };

    if (targets.length) {
      embed.fields?.push({
        name: "Targets",
        value: targets.map((t, i) => `T${i + 1}: $${t.toFixed(2)}`).join("\n"),
        inline: true,
      });
    }

    if (trade.riskReward) {
      embed.fields?.push({ name: "Risk", value: trade.riskReward, inline: true });
    }

    if (trade.conviction) {
      embed.fields?.push({ name: "Conviction", value: trade.conviction, inline: true });
    }

    const confluence = trade.confluenceFactors
      ?.filter((factor) => factor.present)
      .slice(0, 5)
      .map((factor) => `• ${factor.factor}${factor.value ? `: ${factor.value}` : ""}`)
      .join("\n");

    if (confluence) {
      embed.fields?.push({ name: "Confluence", value: confluence, inline: false });
    }

    return embed;
  }

  private buildBacktestShareEmbed(summary: BacktestShareSummary, options?: BacktestShareOptions): DiscordEmbed {
    const titleParts = ["Backtest summary"];
    if (summary.strategy) titleParts.push(summary.strategy);
    if (summary.symbol) titleParts.push(summary.symbol);

    const embed: DiscordEmbed = {
      title: titleParts.join(" — "),
      description: options?.note,
      color: 0x5865f2,
      timestamp: new Date().toISOString(),
      url: options?.link,
      fields: [
        { name: "Win rate", value: `${(summary.winRate * 100).toFixed(1)}%`, inline: true },
        { name: "Total R", value: summary.totalR.toFixed(2), inline: true },
        { name: "Max DD", value: summary.maxDrawdownR.toFixed(2), inline: true },
        { name: "Expectancy", value: summary.expectancyR.toFixed(2), inline: true },
      ],
    };

    if (summary.trades !== undefined) {
      embed.fields?.push({ name: "Trades", value: String(summary.trades), inline: true });
    }

    if (options?.link) {
      embed.fields?.push({ name: "Export", value: options.link, inline: false });
    }

    return embed;
  }

  /**
   * Get emoji for alert type
   */
  private getEmojiForType(type: string): string {
    const emojiMap: Record<string, string> = {
      SETUP_ALERT: "🔔",
      ENTRY_ALERT: "🚀",
      TARGET_HIT: "🎯",
      STOP_LOSS: "🛑",
      PARTIAL_EXIT: "💰",
      CLOSE_POSITION: "🏁",
      CUSTOM: "📢",
    };

    return emojiMap[type] || "📊";
  }

  /**
   * Get color for alert type
   */
  private getColorForType(type: string): number {
    const colorMap: Record<string, number> = {
      SETUP_ALERT: 0x3498db,
      ENTRY_ALERT: 0x2ecc71,
      TARGET_HIT: 0xf39c12,
      STOP_LOSS: 0xe74c3c,
      PARTIAL_EXIT: 0x9b59b6,
      CLOSE_POSITION: 0x95a5a6,
      CUSTOM: 0x34495e,
    };

    return colorMap[type] || 0x7289da;
  }

  async sendSetupAlert(setup: DetectedSetup): Promise<void> {
    const message = `New ${setup.setupType.replace(/_/g, " ")} setup detected on ${setup.symbol}`;

    const alert: DiscordAlert = {
      type: "SETUP_ALERT",
      symbol: setup.symbol,
      message,
      setup,
      timestamp: Date.now(),
    };

    await this.sendAlert(alert);
  }

  async sendEntryAlert(setup: DetectedSetup, contract?: OptionsContract): Promise<void> {
    const message = `Entered ${setup.direction} position on ${setup.symbol}`;

    const alert: DiscordAlert = {
      type: "ENTRY_ALERT",
      symbol: setup.symbol,
      message,
      setup,
      contract,
      timestamp: Date.now(),
    };

    await this.sendAlert(alert);
  }

  async sendTargetHitAlert(
    setup: DetectedSetup,
    targetIndex: number,
    profitLoss?: number,
    profitLossPercent?: number
  ): Promise<void> {
    const message = `Target ${targetIndex + 1} hit on ${setup.symbol}!`;

    const alert: DiscordAlert = {
      type: "TARGET_HIT",
      symbol: setup.symbol,
      message,
      setup,
      profitLoss,
      profitLossPercent,
      timestamp: Date.now(),
    };

    await this.sendAlert(alert);
  }

  async sendStopLossAlert(
    setup: DetectedSetup,
    profitLoss?: number,
    profitLossPercent?: number
  ): Promise<void> {
    const message = `Stop loss hit on ${setup.symbol}`;

    const alert: DiscordAlert = {
      type: "STOP_LOSS",
      symbol: setup.symbol,
      message,
      setup,
      profitLoss,
      profitLossPercent,
      timestamp: Date.now(),
    };

    await this.sendAlert(alert);
  }
}
