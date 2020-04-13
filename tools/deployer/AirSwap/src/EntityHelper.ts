import { BigInt, log } from "@graphprotocol/graph-ts"
import { User, Token } from "../generated/schema"

export function getUser(userAddress: string): User {
  var user = User.load(userAddress)
  // handle new creation of User if they don't exist
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

export function getToken(tokenAddress: string): Token {
  var token = Token.load(tokenAddress)
  // handle new creation of Token if it doesn't exist
  if (!token) {
    token = new Token(tokenAddress)
    token.isBlacklisted = false
    token.save()
  }
  return token as Token
}