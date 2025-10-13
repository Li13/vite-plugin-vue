import type {
  DirectiveNode,
  ElementNode,
  InterpolationNode,
} from '@vue/compiler-dom'
import { NodeTypes } from '@vue/compiler-dom'

export const emptyReg = /^\s*$/
export const isEmpty = (str: string): boolean => emptyReg.test(str)
export const foreachIdentifier = '$_fission_render_each'
export const blockIdentifier = '$_fission_render_block'
export const branchBlockIdentifier = '$_fission_render_block_branch'
export const branchIdentifier = '$_fission_render_branch'
export const valueIdentifier = '$_fission_render_value'

// TSAsExpression TSNonNullExpression  TSTypeParameterInstantiation TSTypeReference

let expressionId = 0
export function createExpressionId(): string {
  return `exp_${expressionId++}`
}

export function createExpressionRoot(): ExpressionRootStack {
  return {
    id: createExpressionId(),
    type: 'EXPRESSION_ROOT',
    parent: null,
    expressionList: [],
  }
}

export function expressionsRootToCode(root: ExpressionRootStack): {
  code: string
  expressionNodeMap: Map<string, ExpressionStack>
} {
  const expressionNodeMap = new Map<string, ExpressionStack>()

  function generateSpecialId(
    identifier: string,
    content: string,
    exp: ExpressionStack,
  ): string {
    expressionNodeMap.set(exp.id, exp)
    return `${identifier}("${exp.id}", ${content})`
  }

  function expressionsListToCode(
    expressions: ExpressionParentStack['expressionList'],
  ): string {
    const list = []
    for (let i = 0; i < expressions.length; i++) {
      const exp = expressions[i]
      if (exp.type === 'EXPRESSION_ROOT') {
        list.push(expressionsListToCode(exp.expressionList))
      } else if (exp.type === 'EXPRESSION_FOR') {
        list.push(
          generateSpecialId(
            foreachIdentifier,
            `${exp.list}, (${exp.value}${exp.key ? ',' + exp.key : ''}${exp.index ? ',' + exp.index : ''}) => ${expressionsListToCode(exp.expressionList)}`,
            exp,
          ),
        )
      } else if (exp.type === 'EXPRESSION_BRANCH_BLOCK') {
        list.push(
          generateSpecialId(
            branchBlockIdentifier,
            expressionsListToCode(exp.expressionList),
            exp,
          ),
        )
      } else if (exp.type === 'EXPRESSION_BRANCH') {
        list.push(
          generateSpecialId(
            branchIdentifier,
            `${exp.value},${expressionsListToCode(exp.expressionList)}`,
            exp,
          ),
        )
      } else if (
        exp.type === 'EXPRESSION_PROP' ||
        exp.type === 'EXPRESSION_TEXT'
      ) {
        list.push(generateSpecialId(valueIdentifier, exp.value || '', exp))
      }
    }
    return joinExp(list)
  }

  if (root.type === 'EXPRESSION_ROOT') {
    const code = expressionsListToCode(root.expressionList)
    return { code, expressionNodeMap }
  }

  return { code: '', expressionNodeMap }
}

export function joinExp(list: string[]): string {
  return `[${list.map((v) => `(${v})`).join(',')}]`
}

export interface ExpressionStackBase {
  id: string
}

export interface ExpressionRootStack extends ExpressionStackBase {
  type: 'EXPRESSION_ROOT'
  parent: ExpressionParentStack | null
  expressionList: ExpressionStack[]
}

export interface ExpressionForStack extends ExpressionStackBase {
  type: 'EXPRESSION_FOR'
  list: string
  key: string
  value: string
  index: string
  expressionList: ExpressionStack[]
  node: ElementNode
  prop: DirectiveNode
  parent: ExpressionParentStack | null
}

export interface ExpressionBranchBlockStack extends ExpressionStackBase {
  type: 'EXPRESSION_BRANCH_BLOCK'
  expressionList: ExpressionStack[]
  parent: ExpressionParentStack | null
}

export interface ExpressionBranchStack extends ExpressionStackBase {
  type: 'EXPRESSION_BRANCH'
  name: string
  value: string | undefined
  expressionList: ExpressionStack[]
  node: ElementNode
  prop: DirectiveNode
  parent: ExpressionParentStack | null
}

export interface ExpressionPropsStack extends ExpressionStackBase {
  type: 'EXPRESSION_PROP'
  value: string | null
  node: ElementNode
  prop: DirectiveNode
  parent: ExpressionParentStack | null
}

export interface ExpressionTextStack extends ExpressionStackBase {
  type: 'EXPRESSION_TEXT'
  value: string | null
  node: InterpolationNode
  parent: ExpressionParentStack | null
}

export type ExpressionStack =
  | ExpressionParentStack
  | ExpressionPropsStack
  | ExpressionTextStack

export type ExpressionParentStack =
  | ExpressionRootStack
  | ExpressionForStack
  | ExpressionBranchBlockStack
  | ExpressionBranchStack

export function createForExpression(
  prop: DirectiveNode,
  node: ElementNode,
): ExpressionForStack | undefined {
  if (
    prop &&
    prop.exp &&
    prop.exp.type === NodeTypes.SIMPLE_EXPRESSION &&
    prop.forParseResult
  ) {
    const { source, key, value, index } = prop.forParseResult
    return {
      id: createExpressionId(),
      type: 'EXPRESSION_FOR',
      list: source.type === NodeTypes.SIMPLE_EXPRESSION ? source.content : '',
      key: key && key.type === NodeTypes.SIMPLE_EXPRESSION ? key.content : '',
      value:
        value && value.type === NodeTypes.SIMPLE_EXPRESSION
          ? value.content
          : '',
      index:
        index && index.type === NodeTypes.SIMPLE_EXPRESSION
          ? index.content
          : '',
      expressionList: [],
      node,
      prop,
      parent: null,
    }
  }
}

export function createBranchBlockExpression(): ExpressionBranchBlockStack {
  return {
    id: createExpressionId(),
    type: 'EXPRESSION_BRANCH_BLOCK',
    expressionList: [],
    parent: null,
  }
}

export function createBranchExpression(
  prop: DirectiveNode,
  node: ElementNode,
): ExpressionBranchStack {
  return {
    id: createExpressionId(),
    type: 'EXPRESSION_BRANCH',
    expressionList: [],
    name: prop.name,
    value:
      prop.exp && prop.exp.type === NodeTypes.SIMPLE_EXPRESSION
        ? prop.exp.content
        : void 0,
    node,
    prop,
    parent: null,
  }
}

export function createPropExpression(
  prop: DirectiveNode,
  node: ElementNode,
  value: string,
): ExpressionPropsStack {
  return {
    id: createExpressionId(),
    type: 'EXPRESSION_PROP',
    value,
    node,
    prop,
    parent: null,
  }
}

export function createTextExpression(
  node: InterpolationNode,
  value: string,
): ExpressionTextStack {
  return {
    id: createExpressionId(),
    type: 'EXPRESSION_TEXT',
    value,
    node,
    parent: null,
  }
}
