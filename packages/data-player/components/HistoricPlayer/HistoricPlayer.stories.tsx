import { Story, Meta } from '@storybook/react/types-6-0';

import HistoricPlayer from './HistoricPlayer';

export default {
  title: 'Components/Data-Player/HistoricPlayer',
  component: HistoricPlayer,
} as Meta;

const Template: Story = (args) => (
  <HistoricPlayer {...args} />
);

export const Default = Template.bind({});
