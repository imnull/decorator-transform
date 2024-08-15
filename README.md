# @imnull/decorator-transform [![npm](https://img.shields.io/npm/v/@imnull/decorator-transform.svg)](https://www.npmjs.com/package/@imnull/decorator-transform)

降级装饰器(Decorator)写法。

直接的业务需求是：在项目改造中，由于`mobx`的装饰器写法导致`esbuild`无法使用，所以无法快速提升开发效率和体验。

其他的，我个人不喜欢这玩意。

## Todo list

- 类装饰器（Class Decorator）✅
- 方法装饰器（Method Decorator）✅
- 访问器装饰器（Accessor Decorator）✅
- 属性装饰器（Property Decorator）✅
- 参数装饰器（Parameter Decorator）❌
- 装饰器工厂（Decorator Factory）✅

*参数装饰器（Parameter Decorator）实现成本太高了，还要额外借助其他的工具包。*

## Demo

原始的一坨代码

```ts
@ObserverFactory("test1")
@Observer
export default class Test {
    @MyMethodDecorator1
    @MyMethodDecorator2
    @MyMethodDecorator3("info")
    test(id: number) {
        console.log("test", id);
    }

    @MyPropertyDecorator
    name: string = "test";

    @MyAccessorDecorator
    get value() {
        return 123;
    }
}
```

转换过程：

```ts
import fs from "fs";
import path from "path";
import { parse } from "./src";

// 读取原始文件
const code1 = fs.readFileSync(path.resolve(__dirname, "./demo/1.ts"), "utf-8");
// 代码直接parse
const code = parse(code1);
// 写入目标文件
fs.writeFileSync(path.resolve(__dirname, "./demo/_1.ts"), code);
```

输出：

```ts
export default (() => {
    const DECORATOR_2 = MyMethodDecorator3("info");
    const DECORATOR_1 = ObserverFactory("test1");
    class Test {
        test(id: number) {
            const descriptor = {
                value: function test(id: number) {
                    console.log("test", id);
                }.bind(this),
            };
            DECORATOR_2(this, "test", descriptor);
            MyMethodDecorator2(this, "test", descriptor);
            MyMethodDecorator1(this, "test", descriptor);
            return descriptor.value(id);
        }
        name = "test";
        get value() {
            return 123;
        }
    }
    MyPropertyDecorator(Test.prototype, "name");
    MyAccessorDecorator(
        Test.prototype,
        "value",
        Object.getOwnPropertyDescriptor(Test.prototype, "value")
    );
    Observer(Test);
    DECORATOR_1(Test);
    return Test;
})();
```
