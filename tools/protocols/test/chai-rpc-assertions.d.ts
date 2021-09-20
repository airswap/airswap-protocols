declare module 'chai' {
  global {
    export namespace Chai {
      interface Assertion {
        JSONRpcRequest(method: string, params?: any): void
        JSONRpcResponse(id: string, result: any): void
        JSONRpcError(id: string, error: any): void
      }
    }
    }
  }
}
