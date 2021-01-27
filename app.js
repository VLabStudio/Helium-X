// Import dependencies
const fs = require("fs");
const readlineSync = require("readline-sync");

class Line {
    lineNumber = undefined;
    tokens = undefined;

    constructor(lineNumber = undefined, tokens = undefined) {
        this.lineNumber = lineNumber;
        this.tokens = tokens;
    }
}

class TypeAlias {
    type = undefined;

    constructor(type = undefined) {
        this.type = type;
    }
}

class Valuable {
    readOnly = false;
    scope = "var";
    type = undefined;
    value = undefined;

    constructor(value = undefined, scope = "var") {
        this.scope = scope;
        this.setValue(value);
        this.readOnly = false;
    }

    addValue(value) {
        if (this.readOnly === false)
            return this.value += this.convertToType(value);

        console.error("TypeError: Assignment to constant variable.");
        process.exit(1);
    }

    subtractValue(value) {
        if (this.readOnly === false)
            return this.value -= this.convertToType(value);

        console.error("TypeError: Assignment to constant variable.");
        process.exit(1);
    }

    multiplyValue(value) {
        if (this.readOnly === false)
            return this.value *= this.convertToType(value);

        console.error("TypeError: Assignment to constant variable.");
        process.exit(1);
    }

    divideValue(value) {
        if (this.readOnly === false)
            return this.value /= this.convertToType(value);

        console.error("TypeError: Assignment to constant variable.");
        process.exit(1);
    }

    modulusValue(value) {
        if (this.readOnly === false && value === 0)
            return this.convertToType(0);

        if (this.readOnly === false)
            return this.value %= this.convertToType(value);

        console.error("TypeError: Assignment to constant variable.");
        process.exit(1);
    }

    getValue() {
        return this.convertToType(this.value);
    }

    setValue(value) {
        if (this.readOnly === false) {
            this.value = this.convertToType(value);
            if (this.scope === "const")
                this.readOnly = true;
        } else {
            console.error("TypeError: Assignment to constant variable.");
            process.exit(1);
        }
    }

    getLength() {
        return this.value.length;
    }

    getType() {
        return this.type;
    }

    copyIntoValue(valuable) {
        this.setValue(this.convertToType(valuable.value));
    }

    convertToType(value) {
        return value;
    }
}

class IntType extends Valuable {
    type = "int";

    convertToType(value) {
        if (!isNaN(value)) {
            return Math.floor(+value);
        } else {
            throw new Error(`TypeError: ${value} is not assignable to integer`)
        }
    }
}

class FloatType extends Valuable {
    type = "float";

    convertToType(value) {
        if (!isNaN(value)) {
            return +value;
        } else {
            throw new Error(`TypeError: ${value} is not assignable to float`);
        }
    }
}

class StringType extends Valuable {
    type = "string";

    getValue(index) {
        if (index !== undefined)
            return new StringType(this.value[index]);

        return this.convertToType(this.value);
    }

    convertToType(value) {
        return String(value);
    }
}

class StringArrayType extends Valuable {
    type = "stringArray";
    getValue(index) {
        return new StringType(this.value[index]);
    }

    setValue(value) {
        this.value = value;
    }

    addValue(value) {
        this.value.push(String(value));
    }

    convertToType(value) {
        return new String(value);
    }
}

const code = `
    type mystring = int
    var mystring name = 5
    var string nameType = ^s

    typeof nameType $name
    print $nameType
`;

function including(code) {
    const includes = code.match(/#include <.*>/g);
    if (includes != null) {
        for (const include of includes) {
            code = code.replace(include, fs.readFileSync(/<(.*)>/.exec(include)[1])).replace(/\r/g, "");
        }
    }

    return code;
}

let lineNumber = 0;
let lines = including(code).split("\n").map((line) => {
    lineNumber++;
    return new Line(lineNumber, line.split(" ").filter((word) => word != "").map(word => {
        word = word.replace(/\^s/g, "");
        word = word.replace(/\^n/g, "\n");
        return word;
    }));
}).filter((line) => line.tokens.length != 0);

(async () => {
    let scope = { variables: {}, regions: {}, aliases: {} };
    InitialiseVariable(scope, "argv", "stringArray", "var");
    scope.variables.argv.setValue(process.argv);

    const output = parse(lines, scope);
    if (output)
        console.log(output);
    process.exit(0);
})();

function parse(lines, scope = { variables: {}, regions: {}, aliases: {} }) {

    let pc = 0;
    let line = undefined;
    let lineNumber = 0;

    try {

        while (true) {

            if (lines[pc] === undefined)
                return undefined;

            lineNumber = lines[pc].lineNumber;
            line = lines[pc].tokens;

            if (line[0].startsWith("//")) {

            } if (line[0].startsWith("debug")) {
                console.log(lines, scope);
            } else if (line[0] === "repeat") {
                if (line[2].startsWith("#")) {
                    const codeAndArguments = convertFunctionArguments(line, 3, 2);
                    InitialiseVariable(codeAndArguments.scope, "index", "int", "var");
                    for (let index = 0; index <= getVal(line[1]).getValue(); index++) {
                        codeAndArguments.scope.variables["index"].setValue(index);
                        callFunction(codeAndArguments);
                    }
                }
            } else if (line[0] === "if") {
                if (line[2] === "==") {
                    if (getVal(line[1]).getValue() == getVal(line[3]).getValue())
                        callFunction(convertFunctionArguments(line, 5, 4));
                } else if (line[2] === "<=") {
                    if (getVal(line[1]).getValue() <= getVal(line[3]).getValue())
                        callFunction(convertFunctionArguments(line, 5, 4));
                } else if (line[2] === ">=") {
                    if (getVal(line[1]).getValue() >= getVal(line[3]).getValue())
                        callFunction(convertFunctionArguments(line, 5, 4));
                } else if (line[2] === "<") {
                    if (getVal(line[1]).getValue() < getVal(line[3]).getValue())
                        callFunction(convertFunctionArguments(line, 5, 4));
                } else if (line[2] === ">") {
                    if (getVal(line[1]).getValue() > getVal(line[3]).getValue())
                        callFunction(convertFunctionArguments(line, 5, 4));
                }
            } else if (line[0].startsWith("#") && !line[0].startsWith("#end")) {
                scope.regions[line[0].substr(1)] = {
                    args: line.slice(1, line.length),
                    code: []
                };

                pc++;
                while (`#end${line[0].substr(1)}` != lines[pc][0]) {
                    scope.regions[line[0].substr(1)].code.push(lines[pc]);
                    pc++;
                }
            } else if (line[0] === "call") {
                callFunction(convertFunctionArguments(line, 2, 1));
            } else if (line[0] === "writeFile") {
                fs.writeFileSync(getVal(line[1]).getValue(), getVal(line[2]).getValue());
            } else if (line[0] === "readFile") {
                scope.variables[line[1]].setValue(fs.readFileSync(getVal(line[2]).getValue()));
            } else if (line[0] === "input") {
                scope.variables[line[1]].setValue(readlineSync.question(line.slice(2, line.length).join(" ")));
            } else if (line[0] === "length") {
                scope.variables[line[1]].setValue(getVal(line[2]).getLength());
            } else if (line[0] === "typeof") {
                scope.variables[line[1]].setValue(getVal(line[2]).getType());
            } else if (line[0] === "random") {
                scope.variables[line[1]].setValue(Math.random());
            } else if (line[0] === "print") {
                let value = getVal(line.slice(1, line.length).join(" ")).getValue() + "\n";

                if (value.includes("^l"))
                    value = value.replace(/[\n|\r|^l]/g, "");

                process.stdout.write(`\x1b[36m${value}\x1b[39m`);
            } else if (line[0] === "clear") {
                console.clear();
            } else if (line[0] === "return") {
                return getVal(line.slice(1, line.length).join(" "));
            } else if (line[0] === "exit") {
                process.exit(line[1]);
            } else if (line[0] === "const" || line[0] === "var") {
                InitialiseVariable(scope, line[2], line[1], line[0]);

                if (line[3] === "=") {
                    if (line[4].startsWith("#")) {
                        scope.variables[line[2]].copyIntoValue(callFunction(convertFunctionArguments(line, 5, 4)));
                    } else {
                        scope.variables[line[2]].copyIntoValue(getVal(line.slice(4, line.length).join(" ")));
                    }
                }
            } else if (line[0] === "type") {
                InitialiseTypeAlias(scope, line[1], line[3]);
            } else if (line[0].startsWith("$")) {
                if (line[1] === "=") {
                    if (line[2].startsWith("#")) {
                        scope.variables[line[0].substr(1)].copyIntoValue(callFunction(convertFunctionArguments(line, 3, 2)));
                    } else {
                        scope.variables[line[0].substr(1)].copyIntoValue(getVal(line.slice(2, line.length).join(" ")));
                    }
                } else if (line[1] === "+=") {
                    if (line[2].startsWith("#")) {
                        scope.variables[line[0].substr(1)].addValue(callFunction(convertFunctionArguments(line, 3, 2)));
                    } else {
                        scope.variables[line[0].substr(1)].addValue(getVal(line.slice(2, line.length).join(" ")).getValue());
                    }
                } else if (line[1] === "-=") {
                    if (line[2].startsWith("#")) {
                        scope.variables[line[0].substr(1)].subtractValue(callFunction(convertFunctionArguments(line, 3, 2)));
                    } else {
                        scope.variables[line[0].substr(1)].subtractValue(getVal(line.slice(2, line.length).join(" ")).getValue());
                    }
                } else if (line[1] === "*=") {
                    if (line[2].startsWith("#")) {
                        scope.variables[line[0].substr(1)].multiplyValue(callFunction(convertFunctionArguments(line, 3, 2)));
                    } else {
                        scope.variables[line[0].substr(1)].multiplyValue(getVal(line.slice(2, line.length).join(" ")).getValue());
                    }
                } else if (line[1] === "/=") {
                    if (line[2].startsWith("#")) {
                        scope.variables[line[0].substr(1)].divideValue(callFunction(convertFunctionArguments(line, 3, 2)));
                    } else {
                        scope.variables[line[0].substr(1)].divideValue(getVal(line.slice(2, line.length).join(" ")).getValue());
                    }
                } else if (line[1] === "%=") {
                    if (line[2].startsWith("#")) {
                        scope.variables[line[0].substr(1)].modulusValue(callFunction(convertFunctionArguments(line, 3, 2)));
                    } else {
                        scope.variables[line[0].substr(1)].modulusValue(getVal(line.slice(2, line.length).join(" ")).getValue());
                    }
                }

            }

            pc++;
        }

    } catch (error) {
        console.error(`\x1b[32m Line number:\x1b[0m ${lineNumber} \x1b[36m Line:\x1b[0m ${line.join(" ")} \x1b[31m Error:\x1b[0m ${error.message} \x1b[0m`);
        process.exit(1);
    }

    function convertFunctionArguments(line, argsIndex, regionIndex) {
        const args = line.slice(argsIndex, line.length);
        const region = scope.regions[line[regionIndex].substr(1)];
        const localScope = { variables: JSON.parse(JSON.stringify(scope.variables)), regions: JSON.parse(JSON.stringify(scope.regions)) };

        for (const key in localScope.variables) {
            const value = localScope.variables[key].value;
            InitialiseVariable(localScope, key, localScope.variables[key].type, localScope.variables[key].scope);
            localScope.variables[key].setValue(value);
        }

        let offset = 0;
        for (let index = 0; index < args.length; index++) {
            InitialiseVariable(localScope, region.args[offset + 1], region.args[offset], "var");
            localScope.variables[region.args[offset + 1]].setValue(getVal(args[index]).getValue());
            offset += 2;
        }

        return { code: region.code, scope: localScope };
    }

    function callFunction(codeAndArguments) {
        return parse(codeAndArguments.code, codeAndArguments.scope);
    }

    function getVal(value) {
        if (value.startsWith("$")) {
            if (value.includes("[")) {
                const properties = /\$(.+)\[(.+)]/.exec(value);
                return scope.variables[properties[1]].getValue(getVal(properties[2]).getValue());
            }
            return scope.variables[value.slice(1, value.length)];
        }

        if (!isNaN(value))
            return new FloatType(value);

        return new StringType(value);
    }

}

// Initialise a type alias
function InitialiseTypeAlias(scope, alias, type) {
    scope.aliases[alias] = new TypeAlias(type);
}

// Initialise a variable
function InitialiseVariable(scope, name, type, typeScope) {
    const types = ["int", "float", "string", "stringArray"];

    if (!types.includes(type)) {
        type = scope.aliases[type].type
    }

    if (type === "int") {
        scope.variables[name] = new IntType(0, typeScope);
    } else if (type === "float") {
        scope.variables[name] = new FloatType(0, typeScope);
    } else if (type === "string") {
        scope.variables[name] = new StringType("", typeScope);
    } else if (type === "stringArray") {
        scope.variables[name] = new StringArrayType([], typeScope);
    }
}