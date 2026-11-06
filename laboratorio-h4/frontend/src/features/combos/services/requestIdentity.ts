export class RequestIdentity {
  private current = 0;

  begin(): number {
    this.current += 1;
    return this.current;
  }

  isCurrent(identity: number, signal?: AbortSignal): boolean {
    return this.current === identity && !signal?.aborted;
  }

  invalidate(): void {
    this.current += 1;
  }
}
