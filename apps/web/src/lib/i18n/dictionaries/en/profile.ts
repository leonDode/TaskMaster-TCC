import type { NamespaceDictionary } from '../../types';

const profile = {
  title: 'Profile',
  accountSettings: 'Account settings',
  displayNameLabel: 'Display name',
  timezoneLabel: 'Timezone',
  changeAvatar: 'Change photo',
  uploadingAvatar: 'Uploading…',
  avatarUpdated: 'Photo updated.',
  avatarTooLarge: 'Image exceeds the 2MB limit.',
  avatarInvalidType: 'Invalid format — use JPEG, PNG or WEBP.',
  timezoneRequired: 'Choose a timezone.',
  saveButton: 'Save changes',
  signOut: 'Sign out',
  loadingLabel: 'Loading profile…',
} satisfies NamespaceDictionary;

export default profile;
