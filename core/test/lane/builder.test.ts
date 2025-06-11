import { describe, it, expect } from 'vitest';
import { GenericLaneBuilder } from '../../src/lane';
import { makeHodr } from '../../src/hodr';
import { PodcastPlatform, Podcast, Episode } from '../types.ts';
import { ParallelStep, TransformStep } from '../../src/lane/step';

/**
 * These tests are designed to verify the type propagation of the lane builders,
 * and not really so much the actual produced lanes.
 *
 * The implementation of the curiously recurring template type makes the types too
 * dense for vitests expectTypeOf to properly work on them, so at this point we'll
 * have to rely on the types being properly resolved in the editor and/or tests not
 * compiling. I guess failed compilation is a kind of failing test too. Heh.
 */
describe('Lane Building', () => {
  it('should produce a lane of three steps', () => {
    // Given
    const root = makeHodr;
    const getActivePodcastNamesBuilder = new GenericLaneBuilder<PodcastPlatform[]>(root, {
      root,
      steps: [],
    });

    // When
    const chained = getActivePodcastNamesBuilder
      .transform((platforms: PodcastPlatform[]) => platforms.flatMap((pf) => pf.podcasts))
      .transform((podcasts: Podcast[]) => podcasts.filter((p) => p.isActive))
      .transform((podcasts: Podcast[]) => podcasts.map((p) => p.name));

    // Then
    const lane = chained.lane;

    expect(lane).toEqual(getActivePodcastNamesBuilder.lane);
    expect(lane.steps).toHaveLength(3);
    expect(lane.steps[0] instanceof TransformStep);
    expect(lane.steps[1] instanceof TransformStep);
    expect(lane.steps[2] instanceof TransformStep);
  });

  it('should produce an aggregate type from joining forked parallell steps', () => {
    // Given

    type Query = {
      platforms: PodcastPlatform[];
      episodeId: string;
    };

    type PodcastAndEpisodeId = {
      podcast: Podcast;
      episodeId: string;
    };

    type EpisodeInfo = {
      episode: Episode;
      podcastName: string;
      episodeOrder: string;
    };

    const root = makeHodr;
    const getAggregatedEpisodeInfo = new GenericLaneBuilder<Query>(root, {
      root,
      steps: [],
    });

    // When
    const chained = getAggregatedEpisodeInfo
      .transform((query) => ({
        podcast: query.platforms
          .flatMap((pf) => pf.podcasts)
          .find((podcast) => podcast.episodes.find((ep) => ep.id === query.episodeId))!,
        episodeId: query.episodeId,
      }))
      .parallel(
        (lane) =>
          lane.transform(
            (pan) => pan.podcast.episodes.find((ep) => ep.id === pan.episodeId)!
          ),
        (lane) => lane.transform((pan: PodcastAndEpisodeId) => pan.podcast.name),
        (lane) =>
          lane.transform((pan) => {
            const epIndex = pan.podcast.episodes
              .map((ep) => ep.id)
              .indexOf(pan.episodeId);
            return `${epIndex} / ${pan.podcast.episodes.length}`;
          })
      )
      .transform(
        ([episode, podcastName, episodeOrder]) =>
          ({
            episode,
            podcastName,
            episodeOrder,
          }) satisfies EpisodeInfo
      );

    // Then
    const lane = chained.lane;

    expect(lane).toEqual(getAggregatedEpisodeInfo.lane);
    expect(lane.steps).toHaveLength(3);
    expect(lane.steps[0] instanceof TransformStep);
    expect(lane.steps[1] instanceof ParallelStep);
    expect(lane.steps[2] instanceof TransformStep);
  });
});
