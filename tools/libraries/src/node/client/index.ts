import { FullOrder } from './../../../../typescript/index'
import { RequestFilter } from './../models/filter/RequestFilter'
import axios from 'axios'

export async function getOrdersBy(
  host: string,
  requestFilter: RequestFilter,
  filters = false
) {
  return await axios.post(host, {
    jsonrpc: '2.0',
    id: '1',
    method: 'getOrders',
    params: [{ ...requestFilter, filters }],
  })
}

export async function getOrders(host: string) {
  return await axios.post(host, {
    jsonrpc: '2.0',
    id: '1',
    method: 'getOrders',
    params: [{}],
  })
}

export async function addOrder(host: string, fullOrder: FullOrder) {
  return await axios.post(host, {
    jsonrpc: '2.0',
    id: '1',
    method: 'addOrder',
    params: [fullOrder],
  })
}

export async function getHealthCheck(host: string) {
  return await axios.get(host)
}
