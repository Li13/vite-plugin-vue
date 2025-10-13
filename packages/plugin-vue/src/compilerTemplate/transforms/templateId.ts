// import type { NodeTransform } from '@vue/compiler-dom'
// import { NodeTypes } from '@vue/compiler-dom'
// import { createAttributeNode, isNaviteTemplate } from '../astUtils/template'

// function createTemplateId() {
//   let i = 0
//   const map: Record<string, string> = {}
//   return function createId(str: string) {
//     if (map[str]) return map[str]
//     const t = 't' + ++i
//     return (map[str] = t)
//   }
// }

// const createId = createTemplateId()

// /**
//  * 为模板节点添加唯一的id
//  * @param id
//  * @returns
//  */
// export function createTransformTemplateId(id: string): NodeTransform {
//   const md5Id = createId(id)
//   let forIndex = 0
//   let templateIndex = 0
//   const forIndexStack: string[] = []
//   return function (node) {
//     if (node.type === NodeTypes.ELEMENT) {
//       if (node['fissionTemplateId']) return
//       if (!node['templateForIndexKey']) {
//         node.props.forEach((prop) => {
//           if (prop.type === NodeTypes.DIRECTIVE && prop.name === 'for') {
//             node['templateForIndexKey'] = `fi${++forIndex}`
//           }
//         })
//       }
//       if (node['templateForIndexKey']) {
//         forIndexStack.push(node['templateForIndexKey'])
//       }

//       if (!node['fissionTemplateId']) {
//         const pId = '{{fis_vid}}'
//         const tId = `${md5Id}${++templateIndex}`
//         const tsId =
//           tId +
//           (forIndexStack.length > 0
//             ? `-${forIndexStack.map((v) => `{{${v}}}`).join('_')}`
//             : '')
//         const fId = `${pId}|${tsId}`
//         node['fissionTemplateId'] = tId
//         node['fissionTemplateScopeId'] = tsId

//         if (!isNaviteTemplate(node.tag)) {
//           node.props.push(createAttributeNode('ftsId', fId))
//         }
//       }
//     }
//     return () => {
//       if (node['templateForIndexKey']) {
//         forIndexStack.pop()
//       }
//     }
//   }
// }
