const ObserverFactory = (name?: string) => {
  return (target: Function) => {
      console.log('ObserverFactory');
      target.prototype.name = name || 'test'
      target.prototype.decorated = true
  }
}

const Observer = (target: Function) => {
  console.log('Observer');
  target.prototype.name = 'test'
  target.prototype.decorated = true
}

const MyMethodDecorator1 = (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
  const originalMethod = descriptor.value;

  descriptor.value = function (id: number) {
      console.log(`Calling 11111 ${String(propertyKey)} with`, id);
      id += 1000
      return originalMethod.call(target, id);
  };
}

const MyMethodDecorator2 = (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
  const originalMethod = descriptor.value;

  descriptor.value = function (id: number) {
      console.log(`Calling 22222 ${String(propertyKey)} with`, id);
      id += 10000
      return originalMethod.call(target, id);
  };
}

const MyMethodDecorator3 = (info: any) => {
  console.log(`MyMethodDecorator3 Decorator Factory`, info);
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;

      descriptor.value = function (id: number) {
          console.log(`Calling 333333 ${String(propertyKey)} with`, id);
          id += 10000
          return originalMethod.call(target, id);
      };
  }
}

const MyPropertyDecorator = (target: any, propertyKey: string | symbol) => {
  const prop = Object.getOwnPropertyDescriptor(target, propertyKey)
  console.log(` ----->>>> MyPropertyDecorator`, { target, propertyKey, prop });
}

const MyAccessorDecorator = (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
  console.log(111111, propertyKey, target, descriptor)
}

const MyParamDecorator = (target: any, propertyKey: string, parameterIndex: number) => {
  console.log(222222, propertyKey, target, parameterIndex)
}

@ObserverFactory('test1')
@Observer
export default class Test {
  @MyMethodDecorator1
  @MyMethodDecorator2
  @MyMethodDecorator3('info')
  test(id: number) {
      console.log('test', id);
  }

  @MyPropertyDecorator
  name: string = 'test'

  @MyAccessorDecorator
  get value() {
      return 123
  }
}


// console.log(t)
// console.log(Object.getOwnPropertyDescriptor(Test.prototype, 'value'))
