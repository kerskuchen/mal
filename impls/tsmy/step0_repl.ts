// deno-lint-ignore-file prefer-const

function READ(str: string)
{
    return str
}

function EVAL(str: string)
{
    return str
}

function PRINT(str: string)
{
    return str
}

function rep(input: string)
{
    return PRINT(EVAL(READ(input)))
}

while (true) {
    let prompt = new TextEncoder().encode("user> ")
    Deno.stdout.writeSync(prompt)
    const buf = new Uint8Array(1024)
    const length = await Deno.stdin.read(buf)
    if (length == null) {
        break
    }
    let inputLine = new TextDecoder().decode(buf.subarray(0, length))
    let result = rep(inputLine)
    console.log(`${result}`)
}