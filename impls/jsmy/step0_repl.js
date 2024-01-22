// deno-lint-ignore-file prefer-const

function READ(str) {
    return str
}

function EVAL(str) {
    return str
}

function PRINT(str) {
    return str
}

function rep(input) {
    return PRINT(EVAL(READ(input)))
}

while (true) {
    let prompt = new TextEncoder().encode("user> ")
    Deno.stdout.writeSync(prompt)
    const buf = new Uint8Array(1024);
    const length = await Deno.stdin.read(buf);
    if (length == Deno.EOF) {
        break
    }
    let inputLine = new TextDecoder().decode(buf.subarray(0, length))
    let result = rep(inputLine)
    console.log(`${result}`)
}