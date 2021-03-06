/**
* Copyright(c) 2014 Spirit IT BV
*
* Functionality to parse a DateTime object to a string
*/
/// <reference path="../typings/lib.d.ts"/>
var Tokenizer = (function () {
    /**
    * Create a new tokenizer
    * @param _formatString (optional) Set the format string
    */
    function Tokenizer(_formatString) {
        this._formatString = _formatString;
    }
    /**
    * Set the format string
    * @param formatString The new string to use for formatting
    */
    Tokenizer.prototype.setFormatString = function (formatString) {
        this._formatString = formatString;
    };

    /**
    * Append a new token to the current list of tokens.
    *
    * @param tokenString The string that makes up the token
    * @param tokenArray The existing array of tokens
    * @param raw (optional) If true, don't parse the token but insert it as is
    * @return Token[] The resulting array of tokens.
    */
    Tokenizer.prototype._appendToken = function (tokenString, tokenArray, raw) {
        if (tokenString !== "") {
            var token = {
                length: tokenString.length,
                raw: tokenString,
                symbol: tokenString[0],
                type: 0 /* IDENTITY */
            };

            if (!raw) {
                token.type = mapSymbolToType(token.symbol);
            }
            tokenArray.push(token);
        }
        return tokenArray;
    };

    /**
    * Parse the internal string and return an array of tokens.
    * @return Token[]
    */
    Tokenizer.prototype.parseTokens = function () {
        var result = [];

        var currentToken = "";
        var previousChar = "";
        var quoting = false;
        var possibleEscaping = false;

        for (var i = 0; i < this._formatString.length; ++i) {
            var currentChar = this._formatString[i];

            // Hanlde escaping and quoting
            if (currentChar === "'") {
                if (!quoting) {
                    if (possibleEscaping) {
                        // Escaped a single ' character without quoting
                        if (currentChar !== previousChar) {
                            result = this._appendToken(currentToken, result);
                            currentToken = "";
                        }
                        currentToken += "'";
                        possibleEscaping = false;
                    } else {
                        possibleEscaping = true;
                    }
                } else {
                    // Two possibilities: Were are done quoting, or we are escaping a ' character
                    if (possibleEscaping) {
                        // Escaping, add ' to the token
                        currentToken += currentChar;
                        possibleEscaping = false;
                    } else {
                        // Maybe escaping, wait for next token if we are escaping
                        possibleEscaping = true;
                    }
                }
                if (!possibleEscaping) {
                    // Current character is relevant, so save it for inspecting next round
                    previousChar = currentChar;
                }
                continue;
            } else if (possibleEscaping) {
                quoting = !quoting;
                possibleEscaping = false;

                // Flush current token
                result = this._appendToken(currentToken, result, !quoting);
                currentToken = "";
            }

            if (quoting) {
                // Quoting mode, add character to token.
                currentToken += currentChar;
                previousChar = currentChar;
                continue;
            }

            if (currentChar !== previousChar) {
                // We stumbled upon a new token!
                result = this._appendToken(currentToken, result);
                currentToken = currentChar;
            } else {
                // We are repeating the token with more characters
                currentToken += currentChar;
            }

            previousChar = currentChar;
        }

        // Don't forget to add the last token to the result!
        result = this._appendToken(currentToken, result, quoting);

        return result;
    };
    return Tokenizer;
})();
exports.Tokenizer = Tokenizer;

/**
* Different types of tokens, each for a DateTime "period type" (like year, month, hour etc.)
*/
(function (DateTimeTokenType) {
    DateTimeTokenType[DateTimeTokenType["IDENTITY"] = 0] = "IDENTITY";

    DateTimeTokenType[DateTimeTokenType["ERA"] = 1] = "ERA";
    DateTimeTokenType[DateTimeTokenType["YEAR"] = 2] = "YEAR";
    DateTimeTokenType[DateTimeTokenType["QUARTER"] = 3] = "QUARTER";
    DateTimeTokenType[DateTimeTokenType["MONTH"] = 4] = "MONTH";
    DateTimeTokenType[DateTimeTokenType["WEEK"] = 5] = "WEEK";
    DateTimeTokenType[DateTimeTokenType["DAY"] = 6] = "DAY";
    DateTimeTokenType[DateTimeTokenType["WEEKDAY"] = 7] = "WEEKDAY";
    DateTimeTokenType[DateTimeTokenType["DAYPERIOD"] = 8] = "DAYPERIOD";
    DateTimeTokenType[DateTimeTokenType["HOUR"] = 9] = "HOUR";
    DateTimeTokenType[DateTimeTokenType["MINUTE"] = 10] = "MINUTE";
    DateTimeTokenType[DateTimeTokenType["SECOND"] = 11] = "SECOND";
    DateTimeTokenType[DateTimeTokenType["ZONE"] = 12] = "ZONE";
})(exports.DateTimeTokenType || (exports.DateTimeTokenType = {}));
var DateTimeTokenType = exports.DateTimeTokenType;


var symbolMapping = {
    "G": 1 /* ERA */,
    "y": 2 /* YEAR */,
    "Y": 2 /* YEAR */,
    "u": 2 /* YEAR */,
    "U": 2 /* YEAR */,
    "r": 2 /* YEAR */,
    "Q": 3 /* QUARTER */,
    "q": 3 /* QUARTER */,
    "M": 4 /* MONTH */,
    "L": 4 /* MONTH */,
    "l": 4 /* MONTH */,
    "w": 5 /* WEEK */,
    "W": 5 /* WEEK */,
    "d": 6 /* DAY */,
    "D": 6 /* DAY */,
    "F": 6 /* DAY */,
    "g": 6 /* DAY */,
    "E": 7 /* WEEKDAY */,
    "e": 7 /* WEEKDAY */,
    "c": 7 /* WEEKDAY */,
    "a": 8 /* DAYPERIOD */,
    "h": 9 /* HOUR */,
    "H": 9 /* HOUR */,
    "k": 9 /* HOUR */,
    "K": 9 /* HOUR */,
    "j": 9 /* HOUR */,
    "J": 9 /* HOUR */,
    "m": 10 /* MINUTE */,
    "s": 11 /* SECOND */,
    "S": 11 /* SECOND */,
    "A": 11 /* SECOND */,
    "z": 12 /* ZONE */,
    "Z": 12 /* ZONE */,
    "O": 12 /* ZONE */,
    "v": 12 /* ZONE */,
    "V": 12 /* ZONE */,
    "X": 12 /* ZONE */,
    "x": 12 /* ZONE */
};

/**
* Map the given symbol to one of the DateTimeTokenTypes
* If there is no mapping, DateTimeTokenType.IDENTITY is used
*
* @param symbol The single-character symbol used to map the token
* @return DateTimeTokenType The Type of token this symbol represents
*/
function mapSymbolToType(symbol) {
    if (symbolMapping.hasOwnProperty(symbol)) {
        return symbolMapping[symbol];
    } else {
        return 0 /* IDENTITY */;
    }
}
//# sourceMappingURL=token.js.map
