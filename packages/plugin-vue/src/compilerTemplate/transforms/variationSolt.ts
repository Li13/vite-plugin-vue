// import type { ElementNode, NodeTransform, TemplateChildNode} from '@vue/compiler-dom';
// import { NodeTypes, findDir, findProp } from '@vue/compiler-dom'
// import { camelize } from '@roundjs/fission-utils'
// import { appendAttrProps, appendDirectiveProps, createAttributeNode, createDirectiveNode, createElementNode, replaceTagName } from '../astUtils/template'
// export function variationSolt(): NodeTransform {
//   return function (node) {
//     if (node.type === NodeTypes.ELEMENT) {
//       markUseSolt(node)
//       for (let i = 0; i < node.children.length; i++) {
//         const cNode = node.children[i]
//         if (cNode.type === NodeTypes.ELEMENT && !cNode.extraData?.variationSolt) {
//           const p = findProp(cNode, 'name')
//           if (cNode.tag === 'slot' && p && p.type === NodeTypes.ATTRIBUTE && p.value.type === NodeTypes.TEXT) {
//             const name = p.value.content
//             replaceTagName(cNode, 'block')
//             appendDirectiveProps(cNode, 'if', `!fisUSlot?.${camelize(name)}`)
//             const nNode = createElementNode('slot', {
//               props: [createDirectiveNode('else'), createAttributeNode('name', name)]
//             })
//             nNode.extraData.variationSolt = true
//             node.children.splice(i + 1, 0, nNode)
//           }
//         }
//       }
//     }
//   }
// }

// function markUseSolt(node: ElementNode) {
//   const slotObj = collectUseSolt(node.children)
//   if (slotObj) {
//     appendAttrProps(node, 'fisUSlot', `{{(${slotObj})}}`)
//   }
// }

// /**
//  * 收集子元素是否有slot
//  * @param children
//  * @returns
//  */
// function collectUseSolt(children: TemplateChildNode[]) {
//   const useSolt = []
//   for (let i = 0; i < children.length; i++) {
//     const node = children[i]
//     if (node.type === NodeTypes.ELEMENT) {
//       const p = findDir(node, 'slot', true)
//       if (p && p.arg.type === NodeTypes.SIMPLE_EXPRESSION && p.arg.isStatic) {
//         useSolt.push(`${camelize(p.arg.content)}:true`)
//       }
//     }
//   }
//   const res = useSolt.join(',')
//   return res ? `{${res}}` : ''
// }
