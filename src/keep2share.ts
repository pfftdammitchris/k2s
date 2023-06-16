/**
 * Documentation: https://keep2share.github.io/api/
 */
import axios from 'axios'
import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosProgressEvent,
} from 'axios'
import type { LiteralUnion, Promisable } from 'type-fest'
// import * as c from './constants'
import { isURL } from './utils'
import type * as t from './types'

const DEFAULT_ITEM_LIMIT = 1000

export class Keep2Share {
  #req: AxiosInstance
  #accessToken: string
  #username: string
  #password: string
  initiated: boolean

  static baseURL = 'https://keep2share.cc';

  [Symbol.for('nodejs.util.inspect.custom')]() {
    return this.toJSON()
  }

  static extractFileId(url: string) {
    if (!isURL(url)) return ''
    const _url = new URL(url)
    if (!/k2s|keep2share/i.test(_url.host)) return ''
    let fileId = url
    let index = fileId.indexOf('/file/')
    if (index > -1) {
      fileId = fileId.substring(index + 6)
      index = fileId.indexOf('/')
      if (index > -1) {
        return fileId.substring(0, index)
      }
      return fileId
    }
    return ''
  }

  constructor(username: string, password: string) {
    this.#req = axios.create({ baseURL: Keep2Share.baseURL })
    this.#accessToken = ''
    this.#username = username
    this.#password = password
    this.initiated = false
  }

  #getRequestBody = (options?: any) => ({
    auth_token: this.#accessToken,
    ...options,
  })

  createURL(fileId: string, fileName: string) {
    return `https://k2s.cc/file/${fileId}/${fileName}`
  }

  get hostname() {
    return /(k2s|keep2share)\.cc/i
  }

  async init({
    onCaptcha,
  }: {
    onCaptcha?: (options: {
      response: {
        message: 'Please verify your request via re captcha challenge'
        status: 'error'
        code: LiteralUnion<406, number>
        errorCode: LiteralUnion<33, number>
      }
      challenge: string
      captcha_url: string
    }) => Promisable<{
      re_captcha_challenge: string
      re_captcha_response: string
    }>
  } = {}) {
    if (this.initiated) return

    let response = await this.#req.post<
      t.Response<{
        auth_token: string
        message: LiteralUnion<
          'success' | 'Please verify your request via re captcha challenge',
          string
        >
        errorCode?: number
      }>
    >(`/api/v2/login`, { username: this.#username, password: this.#password })

    if (/captcha/i.test(response?.data?.message || '')) {
      const { challenge, captcha_url } = await this.fetchCaptcha()

      const result = onCaptcha
        ? await onCaptcha({
            response: response.data,
            challenge,
            captcha_url,
          } as Parameters<typeof onCaptcha>[0])
        : undefined

      if (result) {
        const { re_captcha_challenge, re_captcha_response } = result

        response = await this.#req.post<any>(`/api/v2/login`, {
          username: this.#username,
          password: this.#password,
          re_captcha_challenge,
          re_captcha_response,
        })
      } else {
        throw new Error(
          `Did not receive a re_captcha_challenge and re_captcha_response.`,
        )
      }
      this.#accessToken = response.data?.auth_token
      // if (!_browser) _browser = createBrowser({ headless: false })
      // const page = await getFirstPage(_browser)
      // await page.goto(captcha_url)
    } else {
      this.#accessToken = response.data?.auth_token
    }

    if (!this.#accessToken) {
      throw new Error(`Something went wrong. The access token is empty.`)
    }

    this.#req.defaults.data = {
      ...this.#req.defaults.data,
      access_token: this.#accessToken,
    }

    this.initiated = true
  }

  is(url: URL) {
    return this.hostname.test(url.host)
  }

  async createFileByHash(
    hash: string,
    name: string,
    options?: {
      access?: 'public' | 'private' | 'premium'
      folderId?: string
    },
  ) {
    return (
      await this.#req.post<{ id: string; link: string }>(
        `/api/v2/createFileByHash`,
        this.#getRequestBody({
          hash,
          name,
          access: options?.access || 'public',
          parent: options?.folderId,
        }),
      )
    ).data
  }

  async fetchAccountInfo() {
    return (
      await this.#req.post<
        t.Response<{ available_traffic: number; account_expires: boolean }>
      >(
        '/api/v2/accountInfo',
        this.#getRequestBody({ auth_token: this.#accessToken }),
      )
    ).data
  }

  async fetchBalance() {
    return (
      await this.#req.post<{ balance: number }>(
        `/api/v2/getBalance`,
        this.#getRequestBody(),
      )
    ).data
  }

  async fetchCaptcha() {
    return (
      await this.#req.post<
        t.Response<{ challenge: string; captcha_url: string }>
      >('/api/v2/requestReCaptcha')
    ).data
  }

  async fetchRecaptcha(id: string) {
    return await this.#req.get(`/api/v2/reCaptcha`, { params: { id } })
  }

  async fetchDownloadLink(
    linkOrFileId: string,
    options?: {
      free_download_key?: string
      captcha_challenge?: string
      captcha_response?: string
      url_referrer?: string
    },
  ) {
    if (typeof linkOrFileId !== 'string') {
      throw new Error(`The link or file id is not a string.`)
    }
    if (!linkOrFileId) {
      throw new Error(`Cannot fetch an empty download link`)
    }
    if (isURL(linkOrFileId)) {
      linkOrFileId = Keep2Share.extractFileId(linkOrFileId)
    }
    return (
      (
        await this.#req.post<t.Response<{ url: string }>>(
          `/api/v2/getUrl`,
          this.#getRequestBody({ ...options, file_id: linkOrFileId }),
        )
      ).data?.url || ''
    )
  }

  async fetchIsLinkAvailable(link: string) {
    const fileId = Keep2Share.extractFileId(link)
    return (await this.fetchFileStatus(fileId)).is_available === true
  }

  async fetchDomainsList() {
    return (
      await this.#req.post<
        t.Response<{
          domains: string[]
        }>
      >(`/api/v2/getDomainsList`, this.#getRequestBody())
    ).data
  }

  async fetchFileName(link: string) {
    const index = link.lastIndexOf('/')
    if (index > -1) {
      return link.substring(index + 1)
    }
    return link
  }

  async fetchFileStatus(fileOrFolderId: string) {
    return (
      await this.#req.post<
        t.Response<{
          name: string
          is_available: boolean
          is_folder: boolean
          size: number
          access: t.FileAccess
          video_info: {
            duration: number
            width: number
            height: number
            format: t.VideoFormat
          }
        }>
      >(`/api/v2/getFileStatus`, this.#getRequestBody({ id: fileOrFolderId }))
    ).data
  }

  async fetchIsFileExist(md5: string) {
    return (
      await this.#req.post<t.Response<{ found: boolean }>>(
        `/api/v2/findFile`,
        this.#getRequestBody({ md5 }),
      )
    ).data
  }

  async fetchFile(fileId: string, withExtendedInfo = true) {
    const { status, code, files } = (
      await this.#req.post<t.Response<{ files: t.FileObject[] }>>(
        `/api/v2/getFilesInfo`,
        this.#getRequestBody({
          ids: [fileId],
          extended_info: withExtendedInfo,
        }),
      )
    ).data
    return { status, code, file: files[0] }
  }

  async fetchFiles(options?: {
    /**
     * Default: `false`
     */
    extended_info?:
      | 'abuses'
      | 'access'
      | 'content_type'
      | 'date_download_last'
      | 'downloads'
      | 'size'
      | 'storage_object'
    /**
     * Default: `'/'`
     */
    parent?: string
    /**
     * Default: `1000`
     */
    limit?: number
    /**
     * Default: `0`
     */
    offset?: number
    /**
     * Default: `false`
     */
    only_available?: boolean
    /**
     * @example
     * ```js
     * [{ name: 1 }, { name: -1 }, { date_created: 1 }, { date_created: -1 }]
     * ```
     */
    sort?: any[]
  }) {
    return (
      await this.#req.post<{
        files: Omit<t.FileObject, 'video_info'>[]
      }>(
        `/api/v2/getFilesList`,
        this.#getRequestBody({
          limit: DEFAULT_ITEM_LIMIT,
          parent: '/',
          offset: 0,
          only_available: false,
          extended_info: true,
          ...options,
        }),
      )
    ).data
  }

  async fetchFileStatuses(id: string, limit = DEFAULT_ITEM_LIMIT, offset = 0) {
    return (
      await this.#req.post<
        t.Response<{ files: Omit<t.FileObject, 'extended_info'>[] }>
      >(
        `/api/v2/getFileStatus`,
        this.#getRequestBody({
          id,
          limit,
          offset,
        }),
      )
    ).data
  }

  async fetchIsFileInCloudStorage(md5Hash: string) {
    return (
      await this.#req.post<t.Response<{ found: boolean }>>(
        `/api/v2/findFile`,
        this.#getRequestBody({ md5: md5Hash }),
      )
    ).data
  }

  async upload(
    folderId: string,
    file: string | Buffer | NodeJS.ReadStream,
    {
      on,
      requestOptions,
    }: {
      on?: {
        uploadProgress?: (progressEvent: AxiosProgressEvent) => Promisable<void>
      }
      requestOptions?: AxiosRequestConfig
    } = {},
  ) {
    const fetchUploadFormData = async (folderId: string) => {
      return (
        await this.#req.post<{
          form_action: string // 'https://prx-36.filestore.app/upload'
          file_field: LiteralUnion<'file', string>
          form_data: {
            ajax: boolean
            params: string // Some JWT token
            signature: string // Some hash/encoded string
          }
        }>(
          `/api/v2/getUploadFormData`,
          this.#getRequestBody({ parent_id: folderId }),
          requestOptions,
        )
      ).data
    }

    const processUploadFormData = async ({
      ajax,
      fileField,
      fileData,
      params,
      signature,
      url,
      requestOptions,
    }: {
      url: string
      fileField: string
      fileData: string | Buffer | NodeJS.ReadStream
      ajax: boolean
      params: string
      signature: string
      requestOptions?: AxiosRequestConfig
    }) => {
      return (
        await this.#req.post<{
          success: boolean
          link: string
          user_file_id: string
        }>(
          url,
          {
            ajax: String(ajax),
            [fileField]: fileData,
            params,
            signature,
          },
          {
            maxRedirects: 0,
            ...requestOptions,
            headers: {
              'Content-Type': 'multipart/form-data',
              ...requestOptions?.headers,
            },
          },
        )
      ).data
    }

    const { form_action, file_field, form_data } = await fetchUploadFormData(
      folderId,
    )

    const { link } = await processUploadFormData({
      ajax: form_data.ajax,
      fileField: file_field,
      fileData: file,
      params: form_data.params,
      signature: form_data.signature,
      url: form_action,
      requestOptions: {
        onUploadProgress: on?.uploadProgress,
      },
    })

    return link
  }

  async addRemoteUpload(urls: string | string[]) {
    return (
      await this.#req.post<{
        acceptedUrls: Array<{ url: string; id: string }>
        rejectedUrls: Array<{ url: string; id: string }>
      }>(
        `/api/v2/remoteUploadAdd`,
        this.#getRequestBody({ urls: Array.isArray(urls) ? urls : [urls] }),
      )
    ).data
  }

  async fetchRemoteUploadStatus(ids: string | string[]) {
    return (
      await this.#req.post<{
        uploads: Array<{
          status: number
          progress: number
          file_id: string
        }>
      }>(
        `/api/v2/remoteUploadAdd`,
        this.#getRequestBody({ ids: Array.isArray(ids) ? ids : [ids] }),
      )
    ).data
  }

  async removeFiles(ids: string | string[]) {
    ids = Array.isArray(ids) ? ids : [ids]
    return (
      await this.#req.post<t.Response<{ deleted: number }>>(
        `/api/v2/deleteFiles`,
        this.#getRequestBody({ ids }),
      )
    ).data
  }

  async updateFiles(
    ids: string | string[],
    {
      newName,
      newAccess,
      newParent,
      newIsPublic = false,
    }: {
      newName?: string
      newParent?: string
      newAccess?: t.FileAccess | 'premium'
      newIsPublic?: boolean
    } = {},
  ) {
    ids = Array.isArray(ids) ? ids : [ids]
    return (
      await this.#req.post<
        t.Response<{
          files: Array<{
            id: string
            status: t.ResponseStatus
            errors: string[]
          }>
        }>
      >(
        `/api/v2/updateFiles`,
        this.#getRequestBody({
          new_name: newName,
          new_parent: newParent,
          new_access: newAccess,
          new_is_public: newIsPublic,
        }),
      )
    ).data
  }

  async fetchFoldersList() {
    return (
      await this.#req.post<
        t.Response<{ foldersList: string[]; foldersIds: string[] }>
      >(`/api/v2/getFoldersList`, this.#getRequestBody())
    ).data
  }

  async fetchSubscriptions(
    domain: string,
    options?: {
      limit?: number
      offset?: number
    },
  ) {
    if (!domain) {
      throw new Error(`domain cannot be empty.`)
    }
    return (
      await this.#req.post<
        t.Response<{
          total: number
          items: Array<{
            userEmail: string
            domainName?: string
            /**
             * @example
             * ```js
             * '2021-08-25T15:23:15.000Z'
             * ```
             */
            expiresAt: string
          }>
        }>
      >(
        `/api/v2/getSubscriptions`,
        this.#getRequestBody({
          domain,
          limit: 20,
          ...options,
        }),
      )
    ).data
  }

  toJSON() {
    return {
      initiated: this.initiated,
      username: this.#username,
    }
  }
}
