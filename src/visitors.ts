import { NodePath, traverse, types } from "@babel/core";

type TDecoratorCallback = (options: {
    type: 'factory'
    node: types.Decorator,
    id: string,
} | {
    type: 'property',
    id: string,
    name: string,
    value?: types.Expression,
} | {
    type: 'get/set',
    id: string,
    name: string,
}) => void

let ID = 0

const genId = (prefix = 'DECORATOR') => {
    return `${prefix}_${++ID}`
}

/**
 * 类装饰器（Class Decorator）
 * @returns 
 */
export const ClassDeclaration = (nodePath: NodePath<types.ClassDeclaration>) => {
    const { node } = nodePath

    if (Array.isArray(node.decorators) && node.decorators.length > 0) {
        const decorators = [...node.decorators].reverse()
        const vars: any[] = []
        const decs: any[] = []
        const props: any[] = []

        const callback: TDecoratorCallback = options => {
            if (options.type === 'factory') {
                const exp = options.node.expression as types.CallExpression
                vars.unshift(types.variableDeclaration('const', [
                    types.variableDeclarator(
                        types.identifier(options.id),
                        types.callExpression(exp.callee, exp.arguments)
                    )
                ]))
            } else if (options.type === 'property') {
                props.push(
                    types.expressionStatement(
                        types.callExpression(
                            types.identifier(options.id),
                            [types.memberExpression(node.id, types.identifier('prototype')), types.stringLiteral(options.name)],
                        )
                    )
                )
            } else if(options.type === 'get/set') {
                // const descriptorId = genId('DESCRIPTOR')
                // outProps.push(types.variableDeclaration('const', [
                //     types.variableDeclarator(
                //         types.identifier(descriptorId),
                //         types.callExpression(
                //             types.memberExpression(types.identifier('Object'), types.identifier('getOwnPropertyDescriptor')),
                //             [types.memberExpression(node.id, types.identifier('prototype')), types.stringLiteral(options.name)]
                //         )
                //     )
                // ]))
                props.push(
                    types.expressionStatement(
                        types.callExpression(
                            types.identifier(options.id),
                            [
                                types.memberExpression(node.id, types.identifier('prototype')),
                                types.stringLiteral(options.name),
                                // types.identifier(descriptorId),
                                types.callExpression(
                                    types.memberExpression(types.identifier('Object'), types.identifier('getOwnPropertyDescriptor')),
                                    [types.memberExpression(node.id, types.identifier('prototype')), types.stringLiteral(options.name)]
                                ),
                            ],
                        )
                    )
                )
            }
        }

        decorators.forEach(dec => {
            if (types.isIdentifier(dec.expression)) {
                decs.push(
                    types.expressionStatement(
                        types.callExpression(
                            dec.expression,
                            [node.id]
                        )
                    )
                )
            } else if (types.isCallExpression(dec.expression)) {
                const decId = genId()
                vars.unshift(types.variableDeclaration('const', [
                    types.variableDeclarator(
                        types.identifier(decId),
                        types.callExpression(dec.expression.callee, dec.expression.arguments)
                    )
                ]))
                decs.push(
                    types.expressionStatement(
                        types.callExpression(
                            // types.callExpression(dec.expression.callee, dec.expression.arguments),
                            types.identifier(decId),
                            [node.id]
                        )
                    )
                )
            }
        })

        nodePath.traverse({
            ClassMethod: ClassMethod(callback),
            ClassProperty: ClassProperty(callback)
        })

        const bodys = [
            ...vars,
            types.classDeclaration(
                node.id,
                node.superClass,
                types.classBody([...node.body.body]),
            ),
            ...props,
            ...decs,
            types.returnStatement(node.id)
        ]
        const call = types.callExpression(
            types.arrowFunctionExpression(
                [],
                types.blockStatement(bodys)
            ), []
        )
        if (nodePath.parentPath.isExportDefaultDeclaration()) {
            nodePath.replaceWith(call);
        } else {
            nodePath.replaceWith(
                types.variableDeclaration('const', [
                    types.variableDeclarator(node.id, call)
                ])
            );
        }
    }
}

/**
 * - 方法装饰器（Method Decorator）
 * - 访问器装饰器（Accessor Decorator）
 * @param decoratorCallback 
 * @returns 
 */
const ClassMethod = (decoratorCallback: TDecoratorCallback) => (nodePath: NodePath<types.ClassMethod>) => {
    const { node } = nodePath
    if (Array.isArray(node.decorators) && node.decorators.length > 0) {

        const decorators = [...node.decorators].reverse()

        const params = node.params.filter(p => types.isIdentifier(p) || types.isPattern(p) || types.isRestElement(p))

        if (node.kind === 'method') {
            const descriptorId = types.identifier('descriptor')

            const descriptor = types.variableDeclaration('const', [
                types.variableDeclarator(
                    descriptorId,
                    types.objectExpression([
                        types.objectProperty(
                            types.identifier('value'),
                            types.callExpression(
                                types.memberExpression(
                                    types.functionExpression(node.key as types.Identifier, params, types.blockStatement([
                                        ...node.body.body
                                    ])),
                                    types.identifier('bind')
                                ),
                                [types.thisExpression()]
                            )
                        ),
                    ])
                )
            ])

            const bodys: any[] = [descriptor]

            decorators.forEach(dec => {
                if (types.isIdentifier(dec.expression)) {
                    bodys.push(
                        types.expressionStatement(
                            types.callExpression(
                                types.identifier(dec.expression.name),
                                [types.thisExpression(), types.stringLiteral((node.key as types.Identifier).name), descriptorId]
                            )
                        )
                    )

                } else if (types.isCallExpression(dec.expression)) {
                    const decId = genId()
                    decoratorCallback({ type: 'factory', id: decId, node: dec })
                    bodys.push(
                        types.expressionStatement(
                            types.callExpression(
                                // types.callExpression(dec.expression.callee, dec.expression.arguments),
                                types.identifier(decId),
                                [types.thisExpression(), types.stringLiteral((node.key as types.Identifier).name), descriptorId]
                            )
                        )
                    )
                }
            })

            bodys.push(
                types.returnStatement(
                    types.callExpression(
                        types.memberExpression(types.identifier('descriptor'), types.identifier('value')),
                        node.params as any
                    )
                )
            )

            const methodExpression = types.classMethod(
                node.kind,
                node.key,
                node.params,
                node.body,
                node.computed,
                // node.static,
                // false,
                // node.async,
            )
            methodExpression.body.body = bodys

            nodePath.replaceWith(methodExpression)
        } else if(node.kind === 'get' || node.kind === 'set') {
            if(decorators.length > 0) {
                decorators.forEach(dec => {
                    if (types.isIdentifier(dec.expression)) {
                        decoratorCallback({ type: 'get/set', id: dec.expression.name, name: (node.key as types.Identifier).name })
                    } else if (types.isCallExpression(dec.expression)) {
                        const decId = genId()
                        decoratorCallback({ type: 'factory', id: decId, node: dec })
                        decoratorCallback({ type: 'get/set', id: decId, name: (node.key as types.Identifier).name })
                    }
                })
                const newMethod = types.classMethod(node.kind, node.key, node.params, node.body, node.computed, node.static, node.generator, node.async)
                nodePath.replaceWith(newMethod)
            }
        }
    }
}

/**
 * 属性装饰器（Property Decorator）
 * @param decoratorCallback 
 * @returns 
 */
const ClassProperty = (decoratorCallback: TDecoratorCallback) => (nodePath: NodePath<types.ClassProperty>) => {
    const { node } = nodePath
    if (Array.isArray(node.decorators) && node.decorators.length > 0) {
        const decorators = [...node.decorators].reverse()


        decorators.forEach(dec => {
            if (types.isIdentifier(dec.expression)) {
                decoratorCallback({ type: 'property', id: dec.expression.name, name: (node.key as types.Identifier).name, value: node.value })
            } else if (types.isCallExpression(dec.expression)) {
                const decId = genId()
                decoratorCallback({ type: 'factory', id: decId, node: dec })
                decoratorCallback({ type: 'property', id: decId, name: (node.key as types.Identifier).name, value: node.value })
            }
        })


        const newNode = types.classProperty(node.key, node.value)

        nodePath.replaceWith(newNode)
    }
}
