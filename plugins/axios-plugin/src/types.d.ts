import '@hodr/core';

declare module '@hodr/core' {
  interface HodrServiceBuilder {
    axios(baseUrl?: string): HodrServiceBuilder;
  }
}
