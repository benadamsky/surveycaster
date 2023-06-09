import { buildFarcasterClient } from '../clients/farcaster'
import { getDateTag } from '../utils/getDateTag'

const getCastsInThread = async (hash: string) => {
  const farcaster = buildFarcasterClient()
  const castIterator = await farcaster.fetchCastsInThread({ hash })

  if (!castIterator) {
    throw new Error(`${getDateTag()} Error retrieving cast replies`)
  }

  return castIterator
}

const publishCast = async (
  type: string,
  formattedCast: string,
  formattedReply?: string
) => {
  const farcaster = buildFarcasterClient()

  const cast = await farcaster.publishCast(formattedCast)
  if (formattedReply) {
    await farcaster.publishCast(formattedReply, cast)
  }
  console.log(
    `${getDateTag()} Next ${type} published successfully: ${cast.hash}`
  )

  return cast
}

export { getCastsInThread, publishCast }
