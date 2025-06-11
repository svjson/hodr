/**
 * Represents a podcast show.
 * I'm allowing the use of the word "podcast" _this_ time, because
 * ASoundFileSomeoneUploadedToTheInternet is a terribly long type name.
 */
export type Podcast = {
  id: string;
  name: string;
  description: string;
  language: string;
  categories: string[];
  author: string;
  episodes: Episode[];
  isActive: boolean;
};

/**
 * Represents a podcast episode
 */
export type Episode = {
  id: string;
  title: string;
  description: string;
  durationSeconds: number;
  publishedAt: string;
  audioUrl: string;
  tags: string[];
  explicit: boolean;
};

/**
 * Represents a user of the platform
 */
export type User = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  subscribedPodcastIds: string[];
};

/**
 * Root type representing the platform itself
 */
export type PodcastPlatform = {
  name: string;
  clientVersion: string;
  podcasts: Podcast[];
  users: User[];
  maintenanceMode: boolean;
  lastUpdated: string;
};
