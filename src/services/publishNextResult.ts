import { getNextResult } from '../api/results'
import { getResponses, updateResponses } from '../api/responses'
import { getCastsInThread, publishCast } from '../api/casts'
import { validateResponse } from '../utils/validateResponse'
import { createChart } from '../utils/createChart'
import { formatResult } from '../utils/formatResult'
import { calculateByteSize } from '../utils/byteSize'
import { MAX_BYTE_SIZE, MOCK_IMGUR_URL } from '../utils/constants'
import { getDateTag } from '../utils/getDateTag'

const publishNextResult = async () => {
  const result = await getNextResult()
  const castIterator = await getCastsInThread(result.cast_hash as string)

  const responses: Res[] = []
  const optionCounts: OptionCounts = {}

  // Initialize option counts
  for (let i = 1; i <= 5; i++) {
    if (result[`option_${i}` as keyof Question]) {
      optionCounts[i] = 0
    }
  }

  // Populate responses and option counts
  for await (const cast of castIterator) {
    const match = validateResponse(cast.text)

    if (match) {
      const selected_option = Number(match[1])
      const comment = match[2] !== undefined ? match[2].trim() : ''

      responses.push({
        question_id: result.id,
        selected_option,
        comment,
        fid: cast.author.fid,
      })
      optionCounts[selected_option]++
    }
  }

  // Add extra responses manually from db
  const extraResponses = await getResponses(result.id)
  for (const extraResponse of extraResponses) {
    const optionIndex = extraResponse.selected_option
    if (optionCounts[optionIndex]) {
      optionCounts[optionIndex]++
    } else {
      optionCounts[optionIndex] = 1
    }
  }

  const totalResponses = responses.length + extraResponses.length
  const formattedResult = formatResult(result, optionCounts, totalResponses)
  const chartUrl =
    process.env.NODE_ENV === 'production'
      ? await createChart(result.id, optionCounts, totalResponses)
      : MOCK_IMGUR_URL

  const response = `${formattedResult}\n${chartUrl}`
  const resultByteSize = calculateByteSize(response)

  if (resultByteSize >= MAX_BYTE_SIZE) {
    console.error(
      `${getDateTag()} Error: Result is too large to publish.\nSize: ${resultByteSize} bytes. Max size: ${MAX_BYTE_SIZE} bytes.\n`
    )
    throw new Error(
      `Result too large (${resultByteSize}/${MAX_BYTE_SIZE} bytes).`
    )
  }

  if (process.env.NODE_ENV === 'production') {
    await publishCast('result', response)
    await updateResponses(responses)
  } else {
    console.log(`${getDateTag()} Mock result:\n\n${response}`)
  }
}

export { publishNextResult }
