declare module 'chai' {
  global {
    export namespace Chai {
      interface Assertion {
        JSONRpcRequest(method?: string, params?: any): void
        JSONRpcResponse(method?: string, result?: any): void
      }
    }
    }
  }
}
