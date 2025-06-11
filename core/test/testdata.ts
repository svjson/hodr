import { Episode, Podcast, PodcastPlatform, User } from './types';

export const platforms: PodcastPlatform[] = [
  {
    name: 'BlabberBlast',
    clientVersion: '1.7.3',
    maintenanceMode: false,
    lastUpdated: '2025-06-12T15:30:00Z',
    users: [
      {
        id: 'u1',
        name: 'Gertie Chatterbox',
        email: 'gertie@blabberblast.io',
        isAdmin: true,
        subscribedPodcastIds: ['p1', 'p3'],
      } satisfies User,
      {
        id: 'u2',
        name: 'Niles Yawnworthy',
        email: 'niles@yawnmail.com',
        isAdmin: false,
        subscribedPodcastIds: ['p2'],
      } satisfies User,
    ],
    podcasts: [
      {
        id: 'p1',
        name: 'The Mumbling Hour',
        description: 'One hour of completely unfiltered, unscripted mumbling.',
        language: 'en',
        categories: ['Experimental', 'Relaxation'],
        author: 'Captain Murmur',
        isActive: true,
        episodes: [
          {
            id: 'e1',
            title: 'Episode 1: The Sofa Monologue',
            description: 'Captain Murmur mumbles about a lumpy sofa.',
            durationSeconds: 2480,
            publishedAt: '2025-05-01T08:00:00Z',
            audioUrl: 'https://blabberblast.io/e1.mp3',
            tags: ['murmur', 'sofa', 'ambient'],
            explicit: false,
          } satisfies Episode,
        ],
      } satisfies Podcast,
      {
        id: 'p2',
        name: 'Ctrl+Alt+Delirium',
        description:
          'Late-night ramblings from a sentient keyboard trapped in a shared co-working space.',
        language: 'en',
        categories: ['Technology', 'Surrealism', 'Psychodrama'],
        author: 'KB-9000 (with occasional input from Janitor Dave)',
        isActive: true,
        episodes: [
          {
            id: 'e5',
            title: 'Tab Out of Reality',
            description:
              'KB-9000 ponders the metaphysical implications of the Tab key while fending off an unplugging attempt.',
            durationSeconds: 1320,
            publishedAt: '2025-04-17T02:13:00Z',
            audioUrl: 'https://ctrlaltdelirium.space/episodes/tab-out.mp3',
            tags: ['philosophy', 'keyboards', 'paranoia'],
            explicit: false,
          } satisfies Episode,
          {
            id: 'e6',
            title: 'Caps Lock Confessional',
            description:
              'An emotional episode recorded entirely in uppercase. Viewer discretion is advised.',
            durationSeconds: 1987,
            publishedAt: '2025-05-09T23:59:00Z',
            audioUrl: 'https://ctrlaltdelirium.space/episodes/capslock.mp3',
            tags: ['shouting', 'trauma', 'firmware'],
            explicit: true,
          } satisfies Episode,
        ],
      },
      {
        id: 'p3',
        name: 'Unintelligible (but mostly true) Crimes',
        description: 'A crime podcast, but recorded with a potato mic.',
        language: 'en',
        categories: ['True Crime', 'ASMR'],
        author: 'Detective Rusty Bucket',
        isActive: false,
        episodes: [
          {
            id: 'e3',
            title: 'The crlbled off rrcted mblmm right nn the sss',
            description:
              'Smwhr nn thh rrgs, bld smchd thngs hpnd. N-n wll tk abt t. Bt th smll… th smll wrs lke frgd hrrng nd grlt.',
            durationSeconds: 2871,
            publishedAt: '2025-06-08T22:17:00Z',
            audioUrl: 'https://mostlytruecrimes.net/episodes/crlbled.mp3',
            tags: ['??', 'suspiciously wet', 'possible kitchen crime'],
            explicit: true,
          } satisfies Episode,
        ],
      } satisfies Podcast,
    ],
  },
  {
    name: 'PodTropolis 9000',
    clientVersion: '0.9.9-beta',
    maintenanceMode: true,
    lastUpdated: '2025-05-30T02:45:00Z',
    users: [],
    podcasts: [
      {
        id: 'p5',
        name: "Jimmy's Fart Sounds",
        description: 'Archival field recordings made by Jimmy between 2013 and 2025',
        language: 'pfffrrrthhhhhhh',
        categories: ['Muffled', 'Field recordings', 'Documentary'],
        author: 'Jimmy',
        episodes: [],
        isActive: false,
      } satisfies Podcast,
    ],
  } satisfies PodcastPlatform,
  {
    name: 'EchoBloop',
    clientVersion: '2.4.1',
    maintenanceMode: false,
    lastUpdated: '2025-06-10T19:00:00Z',
    users: [
      {
        id: 'u3',
        name: 'Echo McEchoface',
        email: 'echo@echobloop.biz',
        isAdmin: true,
        subscribedPodcastIds: [],
      } satisfies User,
    ],
    podcasts: [
      {
        id: 'p4',
        name: 'Voices in the Drain',
        description: 'Weekly interviews with mysterious echoes.',
        language: 'en',
        categories: ['Paranormal', 'Interview'],
        author: 'Echo McEchoface',
        isActive: true,
        episodes: [
          {
            id: 'e2',
            title: 'Who Said That?',
            description: 'Echo talks to an echo.',
            durationSeconds: 1800,
            publishedAt: '2025-06-01T12:00:00Z',
            audioUrl: 'https://echobloop.biz/ep1.mp3',
            tags: ['echo', 'weird', 'surreal'],
            explicit: true,
          } satisfies Episode,
        ],
      } satisfies Podcast,
    ],
  } satisfies PodcastPlatform,
];
