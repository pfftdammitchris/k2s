import type { LiteralUnion } from 'type-fest'

export type FileAccess = 'public' | 'private' | 'premium'

export interface FileObject {
  id?: string
  name?: string
  is_available?: boolean
  is_folder?: boolean
  /**
   * @example
   * ```js
   * '2019-01-01 00:00:01'
   * ```
   */
  date_created?: string
  size?: number
  md5?: string
  extended_info?: {
    abuses?: Array<{
      type?: LiteralUnion<'hash', string>
      projects?: string[]
      /**
       * @example
       * ```js
       * '2020-01-01 00:00:01'
       * ```
       */
      blocked_to?: string
    }>
    storage_object?: LiteralUnion<'available', string>
    size?: number
    date_download_last?: '2019-01-01 00:00:01'
    downloads?: number
    access?: LiteralUnion<'public', string>
    content_type?: LiteralUnion<'text', string>
  }
  video_info?: {
    duration?: number
    width?: number
    height?: number
    format?: VideoFormat
  }
}

export type ResponseStatus = 'success' | 'error'

export type Response<O extends Record<string, any> = Record<string, any>> = {
  status: ResponseStatus
  code: LiteralUnion<200 | 406, number>
} & O

export type VideoFormat = LiteralUnion<'MPEG-4', string>
