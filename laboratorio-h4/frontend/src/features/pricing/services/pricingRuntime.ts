import type { ComponentType } from "react";
import type { PricingRepository, ReportFile } from "./pricingRepository";

export interface Clock {
  now(): string;
}
export const systemClock: Clock = { now: () => new Date().toISOString() };
export interface ReportDownloader {
  save(file: ReportFile): void;
}
export interface RepositoryUpdates {
  subscribe(listener: () => void): () => void;
  version(operation: keyof PricingRepository): number;
}
export const noUpdates: RepositoryUpdates = {
  subscribe: () => () => {},
  version: () => 0,
};
export interface PricingRuntime {
  service: PricingRepository;
  clock: Clock;
  downloader: ReportDownloader;
  updates: RepositoryUpdates;
  notice?: { title: string; description: string };
  ReviewTools?: ComponentType;
}
