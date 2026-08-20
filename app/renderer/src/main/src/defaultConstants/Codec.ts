import type { RightItemsProps } from '@/pages/codec/NewCodec'
import type { CodecPageInfoProps } from '@/store/pageInfo'

export const initialRightItems: RightItemsProps[] = [
  // {
  //     title: "Item A",
  //     codecType:"55",
  //     key:"QQ",
  //     node: [
  //         {
  //             leftNode: {name:"DD",type: "input", title: "IV"},
  //             rightNode: {name:"BB",selectArr: [{label:"B",value:"B"}, {label:"K",value:"K"},{label:"M",value:"M"}], type: "select"},
  //             type: "flex"
  //         },
  //     ]
  // },
]

export const defaultCodecPageInfo: CodecPageInfoProps = {
  rightItems: initialRightItems,
  inputEditor: '',
  outputResponse: undefined,
}
