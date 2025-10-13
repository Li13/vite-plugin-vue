// import { NodeTypes } from '@vue/compiler-dom'
// import MagicString from 'magic-string'
// import { parse } from 'acorn'
// import type { Options} from '../../astUtils/template';
// import { fixExtraData, isNaviteTemplate } from '../../astUtils/template'
// import { createCompilerError } from '../../astUtils/traverseHtml'
// import type { ExpressionParentStack, ExpressionStack} from './helper';
// import { blockIdentifier, branchIdentifier, foreachIdentifier } from './helper'
// import { findGlobals } from './findGlobal'

// export function expressionsToCode(expressions: ExpressionParentStack['expressionList']): string {
//   const list = []
//   for (let i = 0; i < expressions.length; i++) {
//     const exp = expressions[i]
//     if (exp.type === 'EXPRESSION_FOR') {
//       list.push(`${foreachIdentifier}(${exp.list}, (${exp.value}${exp.key ? ',' + exp.key : ''}${exp.index ? ',' + exp.index : ''}) => ${expressionsToCode(exp.expressionList)})`)
//     } else if (exp.type === 'EXPRESSION_BRANCH_BLOCK') {
//       list.push(`${branchIdentifier}(${expressionsToCode(exp.expressionList)})`)
//     } else if (exp.type === 'EXPRESSION_BRANCH') {
//       list.push(`[${exp.value},${expressionsToCode(exp.expressionList)}]`)
//     } else if (exp.type === 'EXPRESSION_ROOT') {
//       list.push(expressionsToCode(exp.expressionList))
//     } else if (exp.type === 'EXPRESSION_PROP' || exp.type === 'EXPRESSION_TEXT') {
//       list.push(exp.value)
//     }
//   }
//   return joinExp(list)
// }

// function toTryCallString(code: string) {
//   return `_tryCall(() => (${code}))`
// }

// const filterFlag = 'FISSION_FILTER_FLAG'
// const filterReg = new RegExp(filterFlag)

// export function expressionCodeReplace(ast: any, code: string, options: Options, errors = []) {
//   const s = new MagicString(code)
//   const globs = findGlobals(ast)
//   globs &&
//     globs.forEach(g => {
//       if (options.outPlatform?.globalVariable && g.name === options.outPlatform.globalVariable) return
//       if (g.name === '$event' || [foreachIdentifier, branchIdentifier, blockIdentifier].includes(g.name)) return
//       let before = '$ctx.'
//       if (options.filterTemplateList.includes(g.name)) {
//         before = filterFlag
//       }
//       if (g.nodes) {
//         g.nodes.forEach(node => {
//           const parent = node.parents[node.parents.length - 2]
//           // { top } 简写形式
//           if (parent?.type === 'Property' && parent.shorthand) {
//             s.overwrite(parent.start, parent.end, `${node.name}:${before}${node.name}`)
//             return
//           }
//           if (node.type === 'Identifier') {
//             s.overwrite(node.start, node.end, before + node.name)
//           }
//         })
//       }
//     })
//   return s
// }

// export async function transformExpression(expressions: ExpressionParentStack['expressionList'], options: Options, errors = []) {
//   let code = expressionsToCode(expressions)
//   const { isTs, build } = options
//   if (isTs) {
//     try {
//       const result = await build.esbuild.transform(code, {
//         loader: 'ts',
//         define: build.initialOptions.define,
//         charset: 'utf8'
//       })
//       code = result.code
//     } catch (e) {
//       console.log(e.errors)
//     }
//   }

//   return generateHelpRender(code, expressions, options, errors)
// }

// function generateHelpRender(code: string, expressions: ExpressionStack[], options: Options, errors = []) {
//   // console.log('code', code)
//   const ast = parse(code, {
//     ecmaVersion: 'latest'
//   })

//   const replaceStr = expressionCodeReplace(ast, code, options)

//   const stackName = [
//     {
//       name: 'root',
//       type: 'root',
//       map: {}
//     }
//   ]
//   const stackRender = [[]]

//   function pushRenderStack(item: unknown) {
//     stackRender[stackRender.length - 1].push(item)
//   }

//   function getStackLast<T>(stack: T[]): T {
//     return stack[stack.length - 1]
//   }

//   let i = 0
//   function createName(source: string) {
//     const nameMap = getStackLast(stackName)
//     let name = ''
//     if (nameMap.map[source]) {
//       name = nameMap[source]
//     } else {
//       name = `a_${i++}`
//     }
//     const templateName = nameMap.type === 'for' ? `${nameMap.name}.${name}` : name
//     return {
//       scriptName: name,
//       templateName: templateName
//     }
//   }

//   function getCodeSource(node) {
//     const scriptSource = replaceStr.slice(node.start, node.end)
//     return {
//       scriptSource: scriptSource,
//       source: code.substring(node.start, node.end),
//       hasFilter: filterReg.test(scriptSource)
//     }
//   }

//   function replaceTemplateName(templateName, hasFilter, as, exp, isText?: boolean) {
//     if (hasFilter) {
//       if (as.type === 'MemberExpression' || as.type === 'CallExpression') {
//         if (as.type === 'CallExpression' && as.arguments.length > 0) {
//           as.arguments.forEach(cAst => {
//             if (cAst.type !== 'Literal') {
//               const { source, scriptSource } = getCodeSource(cAst)
//               const { templateName, scriptName } = createName(source)

//               replaceStr.overwrite(cAst.start, cAst.end, templateName)

//               pushRenderStack(`_patch('${scriptName}', ${scriptSource})`)
//             }
//           })
//           if (isText) {
//             exp.node.content.content = replaceStr.slice(as.start, as.end).replace(filterFlag, '')
//           } else {
//             exp.prop.exp.content = replaceStr.slice(as.start, as.end).replace(filterFlag, '')
//           }
//           return true
//         } else if (exp.prop.name === 'on') {
//           exp.prop.exp['isStaticValue'] = true
//           return true
//         }
//       } else {
//         errors.push(createCompilerError('不支持混合filter调用', exp.prop.loc))
//       }
//     } else {
//       if (isText) {
//         exp.node.content.content = templateName
//       } else {
//         exp.prop.exp.content = templateName
//       }
//     }
//   }

//   walk(ast, expressions, (as, exp: ExpressionStack) => {
//     if (exp.type === 'EXPRESSION_BRANCH') {
//       const { source, scriptSource, hasFilter } = getCodeSource(as)
//       const { templateName, scriptName } = createName(source)
//       stackRender.push([])
//       if (hasFilter) {
//         errors.push(createCompilerError('不用再if判断语句中使用filter语法', exp.prop.loc))
//       }
//       if (exp.prop?.exp?.type === NodeTypes.SIMPLE_EXPRESSION) {
//         replaceTemplateName(templateName, hasFilter, as, exp)
//       }
//       return () => {
//         const child = getStackLast(stackRender).join(';')
//         stackRender.pop()
//         if (exp.node['branchFlag'] === 'else') {
//           pushRenderStack(`() => {${child}}`)
//         } else {
//           pushRenderStack(`['${scriptName}', ${toTryCallString(scriptSource)}, () => {${child}}]`)
//         }
//       }
//     } else if (exp.type === 'EXPRESSION_BRANCH_BLOCK') {
//       // str += `helper.patchBlock(${expressionsToCode(exp.expressionList)});`
//       stackRender.push([])
//       return () => {
//         const child = getStackLast(stackRender).join(',')
//         stackRender.pop()
//         pushRenderStack(`_patchJudge([${child}])`)
//       }
//     } else if (exp.type === 'EXPRESSION_FOR') {
//       const { source, scriptSource, hasFilter } = getCodeSource(as.arguments[0])
//       const { templateName, scriptName } = createName(source)
//       if (hasFilter) {
//         errors.push(createCompilerError('不用再for循环语句中使用filter语法', exp.prop.loc))
//       }
//       const itemName = scriptName + '_item'
//       const indexName = scriptName + '_index'
//       stackName.push({
//         type: 'for',
//         name: itemName,
//         map: {}
//       })
//       // v-for="(item, index) in list" v-for="list"
//       if (exp.prop?.exp?.type === NodeTypes.SIMPLE_EXPRESSION) {
//         replaceTemplateName(templateName, hasFilter, as, exp)
//       }
//       const arrowFunction = as.arguments[1]
//       let paramsStr = ''
//       const extraDataFor = {}
//       if (arrowFunction && arrowFunction.type === 'ArrowFunctionExpression' && arrowFunction.body.type === 'ArrayExpression') {
//         const params = arrowFunction.params.map(v => getCodeSource(v))
//         paramsStr = params.map(v => v.source).join(',')
//       }
//       extraDataFor['value'] = itemName
//       extraDataFor['index'] = exp.node['templateForIndexKey'] || indexName

//       fixExtraData(exp.node)
//       exp.node.extraData['forSaveData'] = extraDataFor

//       stackRender.push([])
//       return () => {
//         const child = getStackLast(stackRender).join(';')
//         stackRender.pop()
//         stackName.pop()
//         pushRenderStack(`_patchList('${scriptName}', ${scriptSource}, (${paramsStr}) => {${child}})`)
//       }
//     } else if (exp.type === 'EXPRESSION_ROOT') {
//       //
//     } else if (exp.type === 'EXPRESSION_PROP') {
//       const { source, scriptSource, hasFilter } = getCodeSource(as)
//       const { templateName, scriptName } = createName(source)
//       const templateId = exp.node['fissionTemplateId']
//       if (exp.prop.exp.type === NodeTypes.SIMPLE_EXPRESSION) {
//         if (!replaceTemplateName(templateName, hasFilter, as, exp)) {
//           if (exp.prop.name === 'on') {
//             if (as.type === 'Identifier' || as.type === 'MemberExpression' || as.type === 'ArrowFunctionExpression' || as.type === 'FunctionExpression') {
//               pushRenderStack(`_patchEvent('${scriptName}', ${scriptSource})`)
//             } else {
//               pushRenderStack(`_patchEvent('${scriptName}', ($event) => ${scriptSource})`)
//             }
//           } else if (exp.prop.name === 'bind' && exp.prop.arg.type === NodeTypes.SIMPLE_EXPRESSION && exp.prop.arg.isStatic) {
//             const propName = exp.prop.arg.content
//             if (propName === 'class') {
//               const { staticClasss, sourceCode } = getStaticClass(as, node => replaceStr.slice(node.start, node.end))
//               if (staticClasss.length > 0) {
//                 const node = exp.node
//                 fixExtraData(node)
//                 if (!node.extraData?.staticClassAppend) {
//                   node.extraData.staticClassAppend = []
//                 }
//                 node.extraData.staticClassAppend.push(...staticClasss)
//                 if (sourceCode.length > 0) {
//                   pushRenderStack(`_patch('${scriptName}', _normalizeClass(${toTryCallString(`[${sourceCode.join(',')}]`)}))`)
//                 }
//               } else {
//                 pushRenderStack(`_patch('${scriptName}', _normalizeClass(${toTryCallString(scriptSource)}))`)
//               }
//             } else if (propName === 'style') {
//               pushRenderStack(`_patch('${scriptName}', _normalizeStyle(${toTryCallString(scriptSource)}))`)
//             } else if (propName === 'ref') {
//               if (templateId) {
//                 pushRenderStack(`_patchRef('${templateId}', ${scriptSource}, ${JSON.stringify(exp.node['fissionRefFlag'])})`)
//               }
//             } else if (propName === 'key') {
//               exp.prop.exp.content = scriptName
//               pushRenderStack(`_patchKey('${scriptName}', ${scriptSource})`)
//             } else if (propName === 'is' && exp.node.tag === 'component') {
//               pushRenderStack(`_patch('${scriptName}', ${scriptSource})`)
//             } else if (isNaviteTemplate(exp.node.tag)) {
//               pushRenderStack(`_patchProp('${scriptName}', ${toTryCallString(scriptSource)})`)
//             } else {
//               pushRenderStack(`_patchProps('${scriptName}', '${templateId}', '${propName}', ${toTryCallString(scriptSource)})`)
//             }
//           } else if (exp.prop.name === 'track' && exp.node['v-track-class']) {
//             pushRenderStack(`_patchTrack('${exp.node['v-track-class']}',${toTryCallString(scriptSource)})`)
//           } else {
//             pushRenderStack(`_patch('${scriptName}', ${toTryCallString(scriptSource)})`)
//           }
//         }
//       }
//     } else if (exp.type === 'EXPRESSION_TEXT') {
//       if (as.type !== 'Literal') {
//         if (exp.node.content.type === NodeTypes.SIMPLE_EXPRESSION) {
//           const { source, scriptSource, hasFilter } = getCodeSource(as)
//           const { templateName, scriptName } = createName(source)
//           if (!replaceTemplateName(templateName, hasFilter, as, exp, true)) {
//             pushRenderStack(`_patchText('${scriptName}', ${toTryCallString(scriptSource)})`)
//           }
//         }
//       } else {
//         const { source } = getCodeSource(as)
//         // 处理 30000000000 被转换为 3e10 导致微信报错的场景
//         if (String(parseFloat(source)) === exp.value) {
//           exp.node.content.content = exp.value
//         } else {
//           exp.node.content.content = source
//         }
//       }
//     }
//   })

//   const scriptCode = `export function compileRender($ctx, { _patch, _patchList, _patchJudge, _patchEvent, _patchProps, _patchProp, _patchRef, _patchTrack, _patchText, _patchKey, _tryCall, _normalizeClass, _normalizeStyle, _deepToRaw, _toDisplayString }) {
//     ${getStackLast(stackRender).join(';')}
//   }`

//   return {
//     ast,
//     code,
//     helperCode: scriptCode
//   }
// }

// export function joinExp(list: string[]): string {
//   return `[${list.map(v => `(${v})`).join(',')}]`
// }

// function walk(elements: any, expressions: ExpressionParentStack['expressionList'], fn: Function, context: any = {}) {
//   if (elements && elements.type === 'Program') {
//     walk(getWalkEntry(elements), expressions, fn, context)
//     return
//   }
//   for (let i = 0; i < elements.length; i++) {
//     const ele = elements[i]
//     const exp = expressions[i]
//     if (ele && ele.type === 'CallExpression' && ele.callee.type === 'Identifier' && (ele.callee.name === foreachIdentifier || ele.callee.name === blockIdentifier || ele.callee.name === branchIdentifier)) {
//       // 下一层
//       if (ele.callee.name === foreachIdentifier) {
//         const arrowFunction = ele.arguments[1]
//         if (arrowFunction && arrowFunction.type === 'ArrowFunctionExpression' && arrowFunction.body.type === 'ArrayExpression') {
//           const exit = fn(ele, exp, context)
//           walk(arrowFunction.body.elements, (exp as any)?.expressionList, fn, context)
//           if (exit) {
//             exit()
//           }
//         }
//       } else if (ele.callee.name === branchIdentifier) {
//         const exit = fn(ele, exp, context)
//         const arg0 = ele.arguments[0]
//         if (arg0 && arg0.type === 'ArrayExpression') {
//           for (let c = 0; c < arg0.elements.length; c++) {
//             const branchItem = arg0.elements[c]
//             const branchExp = (exp as any)?.expressionList[c]
//             if (branchItem?.type === 'ArrayExpression') {
//               const bExit = fn(branchItem.elements[0], branchExp, context)
//               const arr = branchItem.elements[1]
//               if (arr?.type === 'ArrayExpression') {
//                 walk(arr.elements, branchExp?.expressionList, fn, context)
//               }
//               if (bExit) {
//                 bExit()
//               }
//             }
//           }
//         }
//         if (exit) {
//           exit()
//         }
//       } else if (ele.callee.name === blockIdentifier) {
//         const arrowFunction = ele.arguments[0]
//         if (arrowFunction && arrowFunction.type === 'ArrowFunctionExpression' && arrowFunction.body.type === 'BlockStatement') {
//           const body = arrowFunction.body
//           let ast = body
//           if (body.body.length === 1) {
//             const exp = arrowFunction.body.body[0]
//             if (exp.type === 'ExpressionStatement') {
//               ast = exp.expression
//             } else {
//               ast = exp
//             }
//           }
//           const exit = fn(ast, exp, context)
//           if (exit) {
//             exit()
//           }
//         }
//       }
//     } else {
//       const exit = fn(ele, exp, context)
//       if (exit) {
//         exit()
//       }
//     }
//   }
// }

// function getWalkEntry(ast: any) {
//   const bodyFist = ast.type === 'Program' && ast.body[0]
//   if (bodyFist && bodyFist.type === 'ExpressionStatement' && bodyFist.expression.type === 'ArrayExpression') {
//     return bodyFist.expression.elements
//   }
//   return []
// }

// function getStaticClass(ast: any, getSource) {
//   const classs = []
//   const sourceCode = []
//   if (ast.type === 'ArrayExpression') {
//     let index = 0
//     while (index < ast.elements.length) {
//       const item = ast.elements[index]
//       if (item.type === 'Literal' && typeof item.value === 'string') {
//         classs.push(item.value)
//         ast.elements.splice(index, 1)
//       } else {
//         sourceCode.push(getSource(item))
//         index++
//       }
//     }
//   }
//   return {
//     staticClasss: classs,
//     sourceCode
//   }
// }
