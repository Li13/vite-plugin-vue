import type {
  SFCTemplateCompileOptions,
  SFCTemplateCompileResults,
} from 'vue/compiler-sfc'
import { parse, transform } from '@vue/compiler-dom'
import type { DirectiveTransform, NodeTransform } from '@vue/compiler-dom'

/**
 * 将 template转换
 *
 * input
 * ```
 * <template>
 *   <div>
 *     <h1>{{ title }}</h1>
 *   </div>
 * </template>
 * ```
 */

const nodeTransforms: NodeTransform[] = []
const directiveTransforms: DirectiveTransform[] = []

export function compileTemplate(
  options: SFCTemplateCompileOptions,
): SFCTemplateCompileResults {
  const ast = options.ast || parse(options.source)
  transform(
    ast,
    Object.assign({}, options.compilerOptions || {}, {
      nodeTransforms: [
        ...nodeTransforms,
        ...(options.compilerOptions?.nodeTransforms || []), // user transforms
      ],
      directiveTransforms: Object.assign(
        {},
        directiveTransforms,
        options.compilerOptions?.directiveTransforms || {}, // user transforms
      ),
    }),
  )
}
