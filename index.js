
var uid = 0;

function queueWatcher(watcher){
	debugger
}

class Dep{
	constructor(){
		this.id = uid++;
    this.subs = [];
	}
	addSub(sub){
		this.subs.push(sub);
	}
	removeSub(sub){
		var index = this.subs.indexOf(sub);
    if (index != -1) {
      this.subs.splice(index, 1);
    }
	}

	depend() {
		if(Dep.target){ // 只有模板中使用了data里面的变量才会有 Dep.target，只是通过js改变data值，而页面中没有使用到，则不会触发 addDep
			Dep.target.addDep(this);
		}
	}

	notify() {
		this.subs.forEach(function(sub) {
			sub.update();
		})
	}
}
Dep.target = null;
function def(obj, key, val, enumerable) {
	Object.defineProperty(obj, key, {
			value: val,
			enumerable: !!enumerable,
			writable: true,
			configurable: true
	})
}




class Observer{
	constructor(data){
		this.data = data;
		this.dep = new Dep();
		def(data, '__ob__', this);
		debugger
		if(Array.isArray(data)){ // 监听数组变化
		
			const arrayProto = Array.prototype
			const arrayMethods = Object.create(arrayProto); // Array {}
			const keys = ['push','pop','shift','unshift','splice','sort','reverse']
			keys.forEach(method=>{
				const original = arrayProto[method]
				Object.defineProperty(arrayMethods, method, {
					value:function(){
						debugger
						const args = [...arguments]
						const result = original.apply(this, args)
						const ob = this.__ob__
        		let inserted
						switch (method) {
							case 'push':
									inserted = args
									break
							case 'unshift':
									inserted = args
									break
							case 'splice':
									inserted = args.slice(2) // splice的第3,4...个参数也可能需要绑定
									break
						}
						if(inserted){
							ob.observeArray(inserted)
						}
						ob.dep.notify()
						return result
					},
					enumerable:true,
					writable: true,
					configurable: true
				})
			})

			keys.forEach(key=>{
				Object.defineProperty(data,key,{
					value: arrayMethods[key],
        	enumerable:true,
        	writable: true,
        	configurable: true
				})
			})

		} else {
			this.walk(data);
		}	  
	}
	walk(data){
		Object.keys(data).forEach((key)=>{
			this.defineReactive(data,key,data[key])
		});
	}

	observeArray(items) {
		for (let i = 0, l = items.length; i < l; i++) {
				observe(items[i])
		}
	}
	
	defineReactive(data,key,val){
		var dep = new Dep();
		var childObj = observe(val); // 递归调用，对象属性又是对象时会继续做拦截操作
		Object.defineProperty(data,key,{
			enumerable: true, // 可枚举
			configurable: false, // 不能再define,
			get() { // 页面{{xxx}}在编译时会触发get操作
				console.log(`${key}触发了Get操作`)
				if (Dep.target) {
					dep.depend();
				}
				if(Array.isArray(val)) {
					dependArray(val)
				}
				return val;
			},
			set(newVal){
				if (newVal === val) {
					return;
				}
				console.log(`${key}触发了Set操作`)
				val = newVal;
				// 新的值是object的话，进行监听
				childObj = observe(newVal);
				// 通知订阅者
				dep.notify();
			}
		})

	}
}

//为数组添加依赖
function dependArray(value) {
	for (let e, i = 0, l = value.length; i < l; i++) {
			e = value[i]
			e && e.__ob__ && e.__ob__.dep.depend()
			if (Array.isArray(e)) {
					dependArray(e)
			}
	}
}


function observe(data,vm){
	if(typeof data !=='object' || !data){ // 不是对象时不观察
		return
	}
	let ob = null
	if(hasOwnProperty.call(data, '__ob__') && data.__ob__ instanceof Observer){
		ob = data.__ob__
	}else{
		ob = new Observer(data);
	}
	return ob
}


// 观察者 传入的是this对象，表达式以及绑定的更新dom的回调函数
class Watcher{
	constructor(vm,expOrFn,cb,options){
		debugger
		this.cb = cb
		this.id = uid++
		this.expOrFn = expOrFn
		this.vm = vm
		this.depIds = {}
		if(options){ // computed 中定义的get函数会被标记为 dirty
			this.dirty = options.lazy
		}
		if(typeof expOrFn === 'function'){
			this.getter = expOrFn;
		} else {
			this.getter = this.parseGetter(expOrFn.trim())
		}
		this.value = this.get();
	}

	update() {
		this.run();
		//queueWatcher(this)
	}
	run() {
		var value = this.get();
		var oldVal = this.value;
		if (value !== oldVal) {
			this.value = value;
			this.cb.call(this.vm, value, oldVal);
		}
	}

	//依赖发生改变以后，获取值是重新赋值的方法
	evaluate() {
		this.value = this.get()
		this.dirty = false
	}
	
	get() {
		Dep.target = this;
		var value = this.getter.call(this.vm,this.vm); // 重要点；执行此处后会触发Object.defineProperty中的get操作。此时Dep对象target指向此watcher
		Dep.target = null;
		return value;
	}

	parseGetter(exp) {
		if (/[^\w.$]/.test(exp)) return; 
		var exps = exp.split('.');
		return function(obj) {
			for (var i = 0, len = exps.length; i < len; i++) {
				if (!obj) return;
				obj = obj[exps[i]];
			}
			return obj;
		}
	}

	addDep(dep){
		if (!this.depIds.hasOwnProperty(dep.id)) {
			dep.addSub(this);
			this.depIds[dep.id] = dep;
		}
	}
}



class Compile{
	constructor(el,vm){
		this.$vm = vm
		this.$el = document.querySelector(el)
		this.$fragment = this.node2Fragment(this.$el)
		this.compileElement(this.$fragment)
		this.$el.appendChild(this.$fragment);
	}
	node2Fragment(el){
		var fragment = document.createDocumentFragment()
		var child = null
		while (child = el.firstChild) {
			fragment.appendChild(child); // 执行这句时会将原先dom节点剪切到fragment中
		}
		return fragment;
	}

	compileElement(el){
		var childNodes = el.childNodes // 返回的是一个类数组
		var arr = [...childNodes] // 类数组转数组
		arr.forEach((node)=>{
			let text = node.textContent
			let reg = /\{\{(.*)\}\}/;
			if(this.isElementNode(node)){
				this.compile(node)
			}else if (this.isTextNode(node) && reg.test(text)) {
				this.compileText(node, RegExp.$1.trim());
			}

			if (node.childNodes && node.childNodes.length) { // 有孩子时候就递归调用
				this.compileElement(node);
			}
		})
	}

	compileText(node,exp){
		const vm = this.$vm
		const value = this._getVMVal(vm,exp)
		var updateFn = function(node,value){
			node.textContent = value
		}
		updateFn(node,value)
		new Watcher(vm,exp,function(value,oldValue){
			updateFn(node,value)
		})
	}

	_getVMVal(vm, exp) { // 页面中可能写例如{{obj.a.b.c}}这样子格式，需要获取到它的值
		var val = vm;
		exp = exp.split('.');
		exp.forEach(function(k) {
				val = val[k];
		});
		return val;
	}

	_setVMVal(vm,exp,value){
		let val = vm
		let e = exp.split('.')
		e.forEach((key,index)=>{
			if(index<e.length-1){
				val = val[key]
			}else{
				val[key] = value
			}
		})
	}

	isElementNode(node) {
		return node.nodeType == 1;
	}

	isTextNode(node) {
		return node.nodeType == 3;
	}

	compile(node){
		var nodeAttrs = [...node.attributes]
		nodeAttrs.forEach(attr=>{
			let attrName = attr.name
			if(attrName.indexOf('v-') == 0){ // 判断是否为指令
				let exp = attr.value;
        let dir = attrName.substring(2);
				if(dir.indexOf('on') === 0){ // 事件指令 例如 <button v-on:click="handleClick">点击</button>
					let eventType = dir.split(':')[1]
					let fn = this.$vm.$options.methods && this.$vm.$options.methods[exp];
					if(eventType && fn){ // 这里只考虑原生事件 不考虑父子组件情况。
						node.addEventListener(eventType, fn.bind(this.$vm), false);
					}
				}else{ // 普通指令 v-model="formData.a.b" 这里不考虑修饰符
					if(dir === 'model'){
						let val = this._getVMVal(this.$vm, exp);
						let updater = function(node,value,oldValue){
							node.value = typeof value == 'undefined' ? '' : value;
						}
						// 先执行一次函数，触发get操作，将值复制给输入框
						let initalVal = this._getVMVal(this.$vm, exp)
						updater(node,initalVal)
						// 后续需要观察这个值，值变动了需要得到更新,这里new Watcher第三个参数为函数，构成一个闭包。compile执行完毕后node变量不会消失。
						new Watcher(this.$vm,exp,function(newVal,oldVal){
							updater(node,newVal,oldVal)
						})
						node.addEventListener("input",(e)=>{
							let newVal = e.target.value
							if(newVal === initalVal){
								return 
							}
							// 对data里的值赋值，会触发set操作，从而通知dep 调用update方法来执行sub里的 watcher
							this._setVMVal(vm,exp,newVal);
						})



					}
				}
			}
		})
	}

}


function initWatch(vm,watch){
	Object.keys(watch).forEach(key=>{
		const handler = watch[key]
		let options = null
		if(Object.prototype.toString.call(handler) === '[object Object]'){
			options = handler
			handler = handler.handler
		}
		if(typeof handler ==='function'){
			options = {}
		}
		vm.$watch(key, handler, options)
	})
}

function initComputed(vm,computed){
	for(const key in computed){
		vm._computedWatchers = Object.create(null)
		let getter = typeof computed[key] === 'function' ? computed[key] : computed[key].get
		vm._computedWatchers[key] = new Watcher(vm, getter, function(){}, { lazy: true })
		if(typeof computed[key] === 'function'){
			Object.defineProperty(vm, key, {
				enumerable: true,
    		configurable: true,
				set:function(){}, // 用户配置的computed如果是个函数的话，则set是个空函数
				get:function(){
					const watcher = vm._computedWatchers && vm._computedWatchers[key]
        	if (watcher) {
            if (watcher.dirty) {
                watcher.evaluate()
            }
            if (Dep.target) {
                watcher.depend()
            }
            return watcher.value
        	}
				}
			})
		}
	}
}


function initWatch(vm,watch){
	Object.keys(watch).forEach(key=>{
		const handler = watch[key]
		let options = null
		if(Object.prototype.toString.call(handler) === '[object Object]'){
			options = handler
			handler = handler.handler
		}
		if(typeof handler ==='function'){
			options = {}
		}
		vm.$watch(key, handler, options)
	})
}

class Vue{
  constructor(options){
    this.$options = options || {};
		// vue data 可以是个对象，如果作为组件可能在多个页面使用时，就必须为函数，避免多个组件data指向同一个data
		this._data = typeof options.data === 'function' ? options.data() : options.data
		// 代理数据，为啥我们可以直接this.xxx访问 data 里属性，而不用 this.data.xxx呢？vue内部做了代理操作。
		Object.keys(this._data).forEach(key=>{
			Object.defineProperty(this,key,{
				configurable: false,
        enumerable: true,
				get(){
					return this._data[key]
				},
				set(newVal){
					this._data[key] = newVal
				}
			})
		})

		// 开始 vue 响应式原理核心点
		observe(this._data, this);
		if (options.computed) {
			initComputed(this, options.computed)
		}
		if(options.watch){
			initWatch(this,options.watch)
		}

		// 编译环节 由于虚拟dom比较复杂，这里我们只考虑手动编译dom来依赖收集
		// 开始编译 id=app 下的内容
		this.$compile = new Compile(options.el,this)
  }

	$watch(expOrFn, cb, options={}){
		const vm = this
		const watcher = new Watcher(vm, expOrFn, cb, options)
    if (options.immediate) {
      cb.call(vm, watcher.value)
    }
	}

	// todo
	$set(target, key, val){

	}

	$delete(){

	}




}



