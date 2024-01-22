// deno-lint-ignore-file prefer-const

function IsDigit(ch: string)
{
    return "0123456789".includes(ch)
}

function IsLetter(ch: string)
{
    return ch.toLowerCase() != ch.toUpperCase()
}

function IsSpecialCharacter(ch: string)
{
    return "()[]{}'`~^@".includes(ch)
}

function IsAllowedSymbolCharacter(ch: string)
{
    return IsDigit(ch) || IsLetter(ch) || "!#$%&*_-+=:<>.|".includes(ch)
}

function IsWhiteSpace(ch: string)
{
    switch (ch) {
        case ' ':
        case ',':
        case '\t':
        case '\r':
        case '\n':
            return true
    }
    return false
}

enum TokenKind
{
    EOF = "EOF",
    Number = "Number",
    String = "String",
    LeftParen = "LeftParen",
    RightParen = "RightParen",
    Special = "Special",
    Symbol = "Symbol",
}

class Token
{
    constructor(
        public kind: TokenKind,
        public text: string
    ) { }
}

class Scanner
{
    public pos = 0
    constructor(
        public source: string
    ) { }

    NextToken(): Token
    {
        this.SkipWhitespaceAndComments()

        let ch = this.Current()
        if (ch == '\0')
            return new Token(TokenKind.EOF, '\0')
        if (ch == '"')
            return this.ReadString()
        if (IsSpecialCharacter(ch))
            return this.ReadSpecialCharacter()
        if (IsDigit(ch))
            return this.ReadNumber()
        if (IsAllowedSymbolCharacter(ch))
            return this.ReadSymbol()

        throw new Error(`Unexpected character '${ch}'`)
    }

    ReadSpecialCharacter(): Token
    {
        let ch = this.Advance()
        let kind = TokenKind.Special
        switch (ch) {
            case '(':
                kind = TokenKind.LeftParen
                break
            case ')':
                kind = TokenKind.RightParen
                break
        }
        return new Token(kind, ch)
    }

    ReadSymbol(): Token
    {
        let text = ""
        while (IsAllowedSymbolCharacter(this.Current())) {
            text += this.Advance()
        }
        return new Token(TokenKind.Symbol, text)
    }

    ReadNumber(): Token
    {
        let text = ""
        while (IsDigit(this.Current())) {
            text += this.Advance()
        }
        if (this.Current() == '.' && IsDigit(this.Lookahead())) {
            text += this.Advance()
            while (IsDigit(this.Current())) {
                text += this.Advance()
            }
        }
        return new Token(TokenKind.Number, text)
    }

    ReadString(): Token
    {
        let text = ""
        text += this.Advance() // consume starting quote
        while (this.Current() != '\0') {
            if (this.Current() == '"') {
                break
            }
            if (this.Current() == '\\' && this.Lookahead() == '\\') {
                text += this.Advance()
                text += this.Advance()
                continue
            }
            if (this.Current() == '\\' && this.Lookahead() == '"') {
                text += this.Advance()
                text += this.Advance()
                continue
            }
            text += this.Advance()
        }

        let closingQuote = this.Advance()
        if (closingQuote != '"')
            throw new Error("Unterminated string")
        text += closingQuote
        return new Token(TokenKind.String, text)
    }

    SkipWhitespaceAndComments()
    {
        let hasWhiteSpaceOrComment = false
        do {
            hasWhiteSpaceOrComment = false
            while (IsWhiteSpace(this.Current())) {
                hasWhiteSpaceOrComment = true
                this.Advance()
            }
            if (this.Current() == ';') {
                hasWhiteSpaceOrComment = true
                while (this.Current() != '\0') {
                    if (this.Current() == '\n') {
                        this.Advance()
                        break
                    }
                    this.Advance()
                }
            }
        } while (hasWhiteSpaceOrComment)
    }

    Current(): string
    {
        return this.Peek(0)
    }

    Lookahead(): string
    {
        return this.Peek(1)
    }

    Advance(): string
    {
        if (this.pos >= this.source.length)
            return '\0'

        let result = this.source[this.pos]
        this.pos += 1
        return result
    }

    Peek(offset = 0): string
    {
        let index = this.pos + offset
        if (index < this.source.length)
            return this.source[index]
        else
            return '\0'
    }
}

enum MalValueKind
{
    Nil = "Nil",
    Bool = "Bool",
    Number = "Number",
    String = "String",
    Symbol = "Symbol",
    List = "List",
}

class MalValue
{
    constructor(
        public kind: MalValueKind,
        public token: Token,
        public value: any,
    ) { }
}

class Parser
{
    public tokens: Token[] = []
    public pos = 0
    constructor(public source: string)
    {
        let scanner = new Scanner(source)
        let tokens = []
        let token
        do {
            token = scanner.NextToken()
            tokens.push(token)
        } while (token.kind != TokenKind.EOF)

        this.tokens = tokens
    }


    ParseForm(): MalValue
    {
        let token = this.Current()
        switch (token.kind) {
            case TokenKind.LeftParen:
                return this.ParseList()
            default:
                return this.ParseAtom()
        }
    }

    ParseList(): MalValue
    {
        let leftParen = this.MatchAndAdvance(TokenKind.LeftParen)
        let result = []
        while (this.Current().kind != TokenKind.EOF) {
            if (this.Current().kind == TokenKind.RightParen)
                break
            let elem = this.ParseForm()
            result.push(elem)
        }
        this.MatchAndAdvance(TokenKind.RightParen)
        return new MalValue(MalValueKind.List, leftParen, result)
    }

    ParseAtom(): MalValue
    {
        let token = this.Advance()
        switch (token.kind) {
            case TokenKind.Number:
                return new MalValue(MalValueKind.Number, token, Number.parseFloat(token.text))
            case TokenKind.String:
                return new MalValue(MalValueKind.String, token, token.text)
            case TokenKind.Symbol:
                return this.ParseSymbol(token)
            default:
                throw new Error(`Unexpected token ${token.kind}: '${token.text}'`)
        }
    }

    ParseSymbol(token: Token): MalValue
    {
        if (token.text == "true")
            return new MalValue(MalValueKind.Bool, token, true)
        if (token.text == "false")
            return new MalValue(MalValueKind.Bool, token, false)
        if (token.text == "nil")
            return new MalValue(MalValueKind.Nil, token, null)

        return new MalValue(MalValueKind.Symbol, token, token.text)
    }

    MatchAndAdvance(expectedTokenKind: TokenKind): Token
    {
        if (this.Current().kind == expectedTokenKind) {
            return this.Advance()
        }
        throw new Error(`Expected token '${expectedTokenKind}', got token ${this.Current().kind}`)
    }

    Current(): Token
    {
        return this.Peek(0)
    }

    Lookahead(): Token
    {
        return this.Peek(1)
    }

    Advance(): Token
    {
        if (this.pos >= this.tokens.length)
            return this.tokens[this.tokens.length - 1]

        let result = this.tokens[this.pos]
        this.pos += 1
        return result
    }

    Peek(offset = 0): Token
    {
        let index = this.pos + offset
        if (index < this.tokens.length)
            return this.tokens[index]
        else
            return this.tokens[this.tokens.length - 1]
    }

}

class EmptyFormException
{
}

function READ(str: string): MalValue
{
    let parser = new Parser(str)
    if (parser.tokens.length == 1)
        throw new EmptyFormException()

    return parser.ParseForm()
}

function EVAL(form: MalValue): MalValue
{
    return form
}

function PRINT(form: MalValue): string
{
    switch (form.kind) {
        case MalValueKind.Nil:
            return "nil"
        case MalValueKind.Bool:
        case MalValueKind.Number:
            return form.value.toString()
        case MalValueKind.String:
            return form.value
        case MalValueKind.List: {
            let result = "("
            for (let [index, elem] of form.value.entries()) {
                result += PRINT(elem)
                if (index != form.value.length - 1)
                    result += " "
            }
            result += ")"
            return result
        }
        case MalValueKind.Symbol:
            return form.value
        default:
            throw new Error(`Unknown form kind '${form.kind}' in PRINT`)
    }
}

function rep(input: string): string
{
    try {
        return PRINT(EVAL(READ(input)))

    } catch (error) {
        if (error instanceof EmptyFormException) {
            return ""
        } else {
            console.error(`>> ERROR: ${error.message}`)
            return ""
        }
    }
}

class Test
{
    public testShouldFail = false
    public expectedOutput
    constructor(
        public line: number,
        public input: string,
        expectedOutput: string
    )
    {
        if (expectedOutput.startsWith(";=>")) {
            this.testShouldFail = false
            this.expectedOutput = expectedOutput.substring(3)
        } else {
            this.testShouldFail = true
            this.expectedOutput = ""
        }
    }
}

function CollectTests(filepath: string): Test[]
{
    let testContentLines = Deno.readTextFileSync(filepath).split("\r\n")
    let lineIndex = 0
    let tests = []
    while (lineIndex < testContentLines.length) {
        if (testContentLines[lineIndex].startsWith(";;")) {
            lineIndex += 1
            continue
        }
        if (testContentLines[lineIndex].trim().length == 0) {
            lineIndex += 1
            continue
        }
        if (testContentLines[lineIndex].startsWith(";>>> deferrable"))
            break

        let testLine = lineIndex + 1
        let input = testContentLines[lineIndex]
        lineIndex += 1
        let expectedOutput = testContentLines[lineIndex]
        lineIndex += 1

        tests.push(new Test(testLine, input, expectedOutput))
    }
    return tests
}

function RunTest(filepath: string)
{
    let tests = CollectTests(filepath)
    for (let test of tests) {
        let output = rep(test.input)
        if (output != test.expectedOutput) {
            console.error(`${filepath}:${test.line} - FAILED: Expected '${test.expectedOutput}' != '${output}' Actual`)
            Deno.exit()
        } else {
            console.log(`${filepath}:${test.line} - PASSED: '${output}'`)
        }
    }

}

RunTest("tests/step1_read_print.mal")
// Deno.exit(0)

while (true) {
    let prompt = new TextEncoder().encode("user> ")
    Deno.stdout.writeSync(prompt)
    const buf = new Uint8Array(1024)
    const length = await Deno.stdin.read(buf)
    if (length == null)
        break

    let inputLine = new TextDecoder().decode(buf.subarray(0, length))
    let result = rep(inputLine)
    console.log(`${result}`)
}