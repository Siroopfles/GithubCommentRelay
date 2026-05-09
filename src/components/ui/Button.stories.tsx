import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    children: { control: 'text' },
    disabled: { control: 'boolean' },
    className: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    children: 'Primary Button',
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    disabled: true,
  },
};

export const CustomClass: Story = {
  args: {
    children: 'Custom Red Button',
    className: 'bg-red-600 hover:bg-red-700',
  },
};
