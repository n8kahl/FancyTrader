import type { Meta, StoryObj } from "@storybook/react";
import { SessionIndicator } from "./SessionIndicator";

const meta: Meta<typeof SessionIndicator> = {
  title: "Status/SessionIndicator",
  component: SessionIndicator,
};

export default meta;

type Story = StoryObj<typeof SessionIndicator>;

export const Mock: Story = {
  args: { mock: true },
};
