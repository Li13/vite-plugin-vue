import type {
  DirectiveNode,
  ElementNode,
  InterpolationNode,
  NodeTransform,
  TemplateNode,
} from '@vue/compiler-dom'
import { NodeTypes } from '@vue/compiler-dom'
import type { ExpressionParentStack, ExpressionRootStack } from './helper'
import {
  blockIdentifier,
  createBranchBlockExpression,
  createBranchExpression,
  createForExpression,
  createPropExpression,
  createTextExpression,
  isEmpty,
} from './helper'

// 定义节点扩展接口，用于类型安全的属性访问
interface ExtendedElementNode extends TemplateNode {
  _branchFlag?: string
  _forFlag?: boolean
}

export function createCollectExp(
  rootStack: ExpressionRootStack,
): NodeTransform {
  return function (node, context) {
    const parent = context.parent as ExtendedElementNode
    const extendedNode = node as ExtendedElementNode

    if (node.type === NodeTypes.ELEMENT) {
      // 处理条件分支和循环指令
      for (let i = 0; i < node.props.length; i++) {
        const p = node.props[i]
        if (p.type === NodeTypes.DIRECTIVE) {
          if (p.name === 'if' || p.name === 'else-if' || p.name === 'else') {
            handleBranchDirective(p, extendedNode, rootStack)
          } else if (p.name === 'for') {
            handleForDirective(p, extendedNode, rootStack)
          }
        }
      }

      // 处理其他指令
      handleOtherDirectives(node, rootStack)
    } else if (node.type === NodeTypes.INTERPOLATION) {
      handleInterpolation(node, rootStack)
    }

    const childIndex = context.childIndex

    return () => {
      handleStackExit(extendedNode, parent, childIndex, rootStack)
    }
  }
}

function handleBranchDirective(
  prop: DirectiveNode,
  node: ExtendedElementNode,
  currentStack: ExpressionParentStack,
) {
  if (prop.name === 'if') {
    const branchBlock = createBranchBlockExpression()
    currentStack.expressionList.push(branchBlock)
    branchBlock.parent = currentStack
    currentStack = branchBlock
  }

  const branch = createBranchExpression(prop, node)
  currentStack.expressionList.push(branch)
  branch.parent = currentStack
  currentStack = branch
  node._branchFlag = prop.name
}

function handleForDirective(
  prop: DirectiveNode,
  node: ExtendedElementNode,
  currentStack: ExpressionParentStack,
) {
  const helpFor = createForExpression(prop, node)
  if (helpFor) {
    currentStack.expressionList.push(helpFor)
    helpFor.parent = currentStack
    currentStack = helpFor
    node._forFlag = true
  }
}

function handleOtherDirectives(
  node: ElementNode,
  currentStack: ExpressionParentStack,
) {
  node.props.forEach((prop) => {
    if (prop.type === NodeTypes.DIRECTIVE) {
      // 跳过已处理的指令
      if (
        prop.name === 'for' ||
        prop.name === 'if' ||
        prop.name === 'else-if' ||
        prop.name === 'else'
      ) {
        return
      }

      if (
        prop.exp &&
        prop.exp.type === NodeTypes.SIMPLE_EXPRESSION &&
        !isEmpty(prop.exp.content)
      ) {
        let content = prop.exp.content
        if (prop.name === 'on') {
          content = `${blockIdentifier}(()=>{${content}})`
        }
        const expNode = createPropExpression(prop, node, content)
        currentStack.expressionList.push(expNode)
      }
    }
  })
}

function handleInterpolation(
  node: InterpolationNode,
  currentStack: ExpressionParentStack,
) {
  if (node.content.type === NodeTypes.SIMPLE_EXPRESSION) {
    const expNode = createTextExpression(node, node.content.content)
    currentStack.expressionList.push(expNode)
  }
}

function handleStackExit(
  node: ExtendedElementNode,
  parent: ExtendedElementNode,
  childIndex: number,
  currentStack: ExpressionParentStack,
) {
  // 处理循环栈退出
  if (node._forFlag) {
    currentStack = currentStack.parent!
  }

  // 处理分支栈退出
  if (node._branchFlag) {
    currentStack = currentStack.parent!
  }

  // 处理分支块栈退出
  if (
    currentStack.type === 'EXPRESSION_BRANCH_BLOCK' &&
    node._branchFlag &&
    !isNextBranch(parent, childIndex, node._branchFlag)
  ) {
    currentStack = currentStack.parent!
  }
}

export function isNextBranch(
  parent: ElementNode,
  childIndex: number,
  name: string,
): boolean {
  if (name === 'else') return false
  if (parent?.type === NodeTypes.ELEMENT || parent?.type === NodeTypes.ROOT) {
    let nextIndex = childIndex + 1
    if (nextIndex >= parent.children.length) {
      return false
    }
    let nextNode = parent.children[nextIndex]

    while (nextNode && nextNode.type === NodeTypes.COMMENT) {
      nextNode = parent.children[++nextIndex]
    }

    if (!nextNode || nextNode.type !== NodeTypes.ELEMENT) return false

    for (let i = 0; i < nextNode.props.length; i++) {
      const p = nextNode.props[i]
      if (p.type === NodeTypes.DIRECTIVE) {
        if (
          (name === 'if' || name === 'else-if') &&
          (p.name === 'else-if' || p.name === 'else')
        ) {
          return true
        }
      }
    }
  }
  return false
}
