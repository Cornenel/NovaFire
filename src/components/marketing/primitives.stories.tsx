import type { Meta, StoryObj } from "@storybook/react";
import {
  MarketingCta,
  MarketingPanel,
  SectionHeading,
} from "./primitives";

const meta: Meta = {
  title: "Marketing/Primitives",
  parameters: { layout: "padded" },
};

export default meta;

type Story = StoryObj;

export const SectionHeadingDefault: Story = {
  render: () => (
    <SectionHeading
      eyebrow="Services"
      title="Practical fire protection for real operating sites"
      description="Scoped servicing, supply and documentation for Mpumalanga and Limpopo."
    />
  ),
};

export const Buttons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <MarketingCta href="#">Request a quote</MarketingCta>
      <MarketingCta href="#" variant="secondary">
        Contact
      </MarketingCta>
      <MarketingCta href="#" variant="ghost">
        Learn more
      </MarketingCta>
    </div>
  ),
};

export const Panel: Story = {
  render: () => (
    <MarketingPanel>
      <h3 className="text-lg font-semibold text-zinc-50">Equipment register</h3>
      <p className="mt-2 text-sm text-zinc-400">
        Authorised clients can review released service records in the portal.
      </p>
    </MarketingPanel>
  ),
};
