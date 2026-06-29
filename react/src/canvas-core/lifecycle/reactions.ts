export interface LifecycleReaction<TSignal> {
  id: string;
  run: (signal: TSignal) => void;
}

export function runLifecycleReactions<TSignal>(
  reactions: readonly LifecycleReaction<TSignal>[],
  signal: TSignal
) {
  for (const reaction of reactions) {
    reaction.run(signal);
  }
}
