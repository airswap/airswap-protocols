import { BigInt, log } from "@graphprotocol/graph-ts"
import { User } from "../generated/schema"

export function getUser(userAddress: string): User {
  var user = User.load(userAddress)
  // handle new creation of User (signer)
  if (!user) {
    user = new User(userAddress)
    user.authorizedSigners = new Array<string>()
    user.authorizedSenders = new Array<string>()
    user.executedOrders = new Array<string>()
    user.cancelledNonces = new Array<BigInt>()
    user.save()
  }
  return user as User
}