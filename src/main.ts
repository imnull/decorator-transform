import { parseSync, transformFromAstSync, traverse } from '@babel/core'

import { ClassDeclaration } from './visitors'

export const parse = (source: string, type: 'ts' = 'ts'): string => {
    const ast = parseSync(source, {
        sourceType: 'module',
        plugins: [
            ['@babel/plugin-proposal-decorators', { version: '2018-09', decoratorsBeforeExport: true }]
        ],
        presets: [
            '@babel/preset-typescript',
        ],
        filename: `.${type}`,
    })

    traverse(ast, { ClassDeclaration })

    const { code = '' } = transformFromAstSync(ast) || {}
    return code
}

/**
 * - 1. 类装饰器（Class Decorator）
 * - 2. 方法装饰器（Method Decorator）
 * - 3. 访问器装饰器（Accessor Decorator）
 * - 4. 属性装饰器（Property Decorator）
 * - 5. 参数装饰器（Parameter Decorator）
 * - 6. 装饰器工厂（Decorator Factory）
 */