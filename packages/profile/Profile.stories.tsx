import { Story, Meta } from '@storybook/react/types-6-0';

import amotbrua from './mocks/amotbrua.json';

import Profile, { ProfileProps } from './Profile';

export default {
  title: 'Components/Profile',
  component: Profile,
} as Meta;

const Template: Story<ProfileProps> = (args) => (
  <Profile
    {...args}
  />
);

export const Default = Template.bind({});

Default.args = {
  profile: amotbrua,
};
