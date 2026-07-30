import { AIChatQSData, AIChatQSDataTypeEnum } from './aiRender'

const getQuestionText = (item: AIChatQSData): string => {
  if (item.type !== AIChatQSDataTypeEnum.QUESTION) return ''
  const showQS = item.extraValue?.showQS
  return (typeof showQS === 'string' ? showQS : '') || item.data.qs || ''
}

/**
 * 后端未回传 USER_FREE_INPUT_UUID 时，用最近一条尚未绑定 taskIndex 的同文问题
 * 识别前端乐观消息，避免同一次输入在出队事件后重复展示。
 */
export const findOptimisticQuestionId = (
  contents: Map<string, AIChatQSData>,
  confirmedQuestion: AIChatQSData,
): string | undefined => {
  const questionText = getQuestionText(confirmedQuestion)
  if (!questionText) return

  return Array.from(contents.values())
    .reverse()
    .find(
      (item) =>
        item.id !== confirmedQuestion.id &&
        item.type === AIChatQSDataTypeEnum.QUESTION &&
        !item.taskIndex &&
        getQuestionText(item) === questionText &&
        Math.abs((confirmedQuestion.Timestamp || 0) - (item.Timestamp || 0)) <= 60,
    )?.id
}
