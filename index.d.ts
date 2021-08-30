import { Plugin } from 'vite'

export declare interface Options {
  /**
   * Filters which determine the fetching method
   * @default {
   *  onlineFirst: "[ '/api/' ]",
   *  onlineOnly: "[ 'http://' ]",
   *  cacheFirst: "[ self.location.origin, 'cdn' ]",
   *  cacheOnly: "[]",
   * }
   */
  filters: {
    onlineOnly: string[]
    cacheOnly: string[]
    onlineFirst: string[]
    cacheFirst: string[]
  }

  /**
   * Show logs of the service worker
   * @default false
   */
  verbose: boolean
}

declare function sw(options?: Options): Plugin

export default sw
