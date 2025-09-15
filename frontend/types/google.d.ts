declare global {
  interface Window {
    gapi: {
      load: (apis: string, callback: () => void) => void
      client: {
        init: (config: {
          apiKey: string
          clientId: string
          discoveryDocs: string[]
          scope: string
        }) => Promise<void>
        calendar: {
          events: {
            list: (params: any) => Promise<{ result: { items?: any[] } }>
            insert: (params: any) => Promise<{ result: { id?: string } }>
          }
        }
      }
      auth2: {
        getAuthInstance: () => {
          isSignedIn: {
            get: () => boolean
          }
          signIn: () => Promise<void>
        }
      }
    }
  }
}

export {}