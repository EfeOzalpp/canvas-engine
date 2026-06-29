import type { LifecycleReaction } from "../reactions";

export type CustomSignalCleanup = () => void;

export interface CustomSignal<TValue> {
  read: () => TValue;
  subscribe: (listener: (value: TValue) => void) => CustomSignalCleanup;
}

export interface CustomValueSignal<TValue> {
  type: "custom-value";
  id: string;
  value: TValue;
}

export type CustomSignalReaction<TValue> = LifecycleReaction<CustomValueSignal<TValue>>;
