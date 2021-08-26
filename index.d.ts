import { Plugin } from 'vite'

export declare interface Options {
  /**
   * Path to index
   * @default 'index.html'
   */
  indexPath?: string

  /**
   * Path to index
   * @default 'dist'
   */
  buildPath?: string

  /**
   * Path to index
   * @default {
   *  onlineFirst: "[ '/api/' ]",
   *  onlineOnly: "[ 'http://' ]",
   *  cacheFirst: "[ self.location.origin, 'cdn' ]",
   *  cacheOnly: "[]",
   * }
   */
  regexes: {
    onlineFirst: string[]
    onlineOnly: string[]
    cacheFirst: string[]
    cacheOnly: string[]
  }

  /**
   * Show logs of the service worker
   * @default false
   */
  showLogs: boolean
}

declare function sw(options?: Options): Plugin

export default sw
