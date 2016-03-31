/**
 * @class Terrasoft.controls.MultiMaskEdit
 * Элемент управления с маской ввода
 */
Ext.define("MultiMaskEdit", {
    extend: "Terrasoft.TextEdit",

    alternateClassName: "Terrasoft.MultiMaskEdit",

    /**
	 * Выравнивание значение в режиме отображения
	 * @public
	 * @type {Terrasoft.Align}
	 */
    textAlign: Terrasoft.Align.LEFT,

    /**
	 * Обработчик события получения элементом фокуса.
	 * При получении фокуса текст внутри элемента форматируется и выравнивается слева
	 * @protected
	 * @overridden
	 */
    onFocus: function (e) {
        this.callParent(arguments);
        var value = this.getTypedValue();
        this.setDomValue(value);
    },

    /**
	 * Получает значения поля ввода сохраненного в классе элемента управления
	 * @protected
	 * @virtual
	 * @return {String}
	 */
    getInitValue: function () {
        var value = this.callParent(arguments);
        if (!Ext.isEmpty(value) && !Ext.isEmpty(this.masks)) {
            var formatValue = this.formatValue(value);
            this.value = formatValue.value;
            var validationInfo = this.getValidationInfo(formatValue);
            this.setValidationInfo(validationInfo);
        }
        return this.value;
    },

    getValidationInfo: function (value) {
        var formatValue = (!Ext.isEmpty(value) && Ext.isBoolean(value.isComplete)) ? value : this.formatValue(value);
        var validationInfo = {
            isValid: true,
            invalidMessage: ""
        };
        if (!formatValue.isComplete) {
            validationInfo = {
                isValid: false,
                invalidMessage: this.getIncorrectNumberMessage()
            };
        }
        return validationInfo;
    },

    getIncorrectNumberMessage: function () {
        return "Некорректный номер";
    },
    /**
	 * Обработчик события нажатия клавиши.
	 * Предотвращает ввод из клавиатуры запрещенных символов или значений не соответствующих шаблону numberRe.
	 * Метод параметризован, второй параметр задает режим обработки события.
	 * @protected
	 * @overridden
	 * @param  {Event} e DOM событие keypress
	 * @param  {String} type (optional) Если параметр не задан ввод обрабатывается как для целого числа, если задано
	 * значение Terrasoft.DataValueType.FLOAT ввод обрабатывается как для дробного числа
	 */
    onKeyPress: function (e) {
        this.callParent(arguments);
        if (this.readonly || Ext.isEmpty(this.masks)) {
            return;
        }
        var isSpecialKey = Ext.isGecko && e.isSpecialKey();
        if (isSpecialKey) {
            return;
        }
        e.preventDefault();
        var keyUnicode = e.getKey();
        var key = String.fromCharCode(keyUnicode);
        if (this.baseCharsRe && !this.baseCharsRe.test(key)) {
            return;
        }
        var domEl = e.getTarget();
        var info = this.getInputInfo(domEl);
        var formatValue = this.formatValueByInsChar(key, info.caretPosition, info.valueBeforeCaret, info.valueSelected,
			info.valueAfterCaret);
        if (!formatValue) {
            return;
        }
        domEl.value = formatValue.value;
        Terrasoft.utils.dom.setCaretPosition(domEl, formatValue.pos);
        if (!this.validationInfo.isValid && formatValue.isComplete) {
            var validationInfo = {
                isValid: true,
                invalidMessage: ""
            };
            this.setValidationInfo(validationInfo);
        }
    },

    getInputInfo: function (domEl) {
        var selectedTextLength = Terrasoft.utils.dom.getSelectedTextLength(domEl);
        var caretPosition = Terrasoft.utils.dom.getCaretPosition(domEl);
        var value = domEl.value;
        var valueBeforeCaret = "";
        var valueAfterCaret = "";
        var valueSelected = "";
        if (Ext.isIE) {
            valueBeforeCaret = value.slice(0, caretPosition - selectedTextLength);
            valueAfterCaret = value.slice(caretPosition);
            caretPosition -= selectedTextLength;
        } else {
            valueBeforeCaret = value.slice(0, caretPosition);
            valueAfterCaret = value.slice(caretPosition + selectedTextLength);
        }
        if (selectedTextLength > 0) {
            valueSelected = value.slice(caretPosition, selectedTextLength + caretPosition);
        }
        return {
            selectedTextLength: selectedTextLength,
            caretPosition: caretPosition,
            value: value,
            valueBeforeCaret: valueBeforeCaret,
            valueAfterCaret: valueAfterCaret,
            valueSelected: valueSelected
        };
    },

    /**
	 * Обработчик события "клавиша отжата" в поле ввода элемента управления
	 * @protected
	 */
    //TODO: пофиксить ввод с середины строки
    onKeyDown: function (e) {
        this.callParent(arguments);
        if (Ext.isEmpty(this.masks)) {
            return;
        }
        var key = e.getKey();
        var matches, masks, placeHolders, commonStr;
        if (key === e.BACKSPACE || key === e.DELETE) {
            e.preventDefault();
            var domEl = e.getTarget();
            var info = this.getInputInfo(domEl);
            //удаляется все
            if (info.valueBeforeCaret === "" && info.valueAfterCaret === "") {
                this.setDomValue("");
            }
                //есть выделенный текст
            else if (info.selectedTextLength > 0) {
                //удаляется конец строки
                if (Ext.isEmpty(info.valueAfterCaret)) {
                    this.setDomValue(this.removeEndPlaceHolders(info.valueBeforeCaret));
                } else {
                    //все совпадения по тексту до удаляемого
                    matches = this.getMatchesByValue(info.valueBeforeCaret);
                    if (matches.matches.length === 0) {
                        return;
                    }
                    //валидные маски
                    masks = this.getPropertyValuesFromArray(matches.matches, "mask");
                    //замещаемый текст
                    placeHolders = this.getPropertyValuesFromArray(masks, "placeHolder");
                    var replaceText = this.getCommonStartString(placeHolders).substr(info.caretPosition, info.selectedTextLength);
                    if (replaceText.length === info.selectedTextLength) {
                        this.setDomValue(info.valueBeforeCaret + replaceText + info.valueAfterCaret);
                    }
                }
            } else if (key === e.BACKSPACE && !Ext.isEmpty(info.valueBeforeCaret)) {
                //TODO: вынести повтор кода в метод, этот код также есть в formatValue()
                //var beforeText = info.valueBeforeCaret.slice(0, -1);
                //все совпадения
                matches = this.getMatchesByValue(info.valueBeforeCaret);
                if (matches.matches.length === 0) {
                    return;
                }
                //валидные маски
                masks = this.getPropertyValuesFromArray(matches.matches, "mask");
                //замещаемый текст
                placeHolders = this.getPropertyValuesFromArray(masks, "placeHolder");
                commonStr = this.getCommonStartString(placeHolders);
                if (commonStr.length >= info.caretPosition) {
                    this.setDomValueAndCaret(info.valueBeforeCaret.slice(0, -1) + commonStr.substr(info.caretPosition - 1, 1) + info.valueAfterCaret, info.caretPosition - 1);
                }
            } else if (key === e.DELETE && !Ext.isEmpty(info.valueAfterCaret)) {
                //TODO: вынести повтор кода в метод, этот код также есть в formatValue()
                //все совпадения
                matches = this.getMatchesByValue(info.valueBeforeCaret);
                if (matches.matches.length === 0) {
                    return;
                }
                //валидные маски
                masks = this.getPropertyValuesFromArray(matches.matches, "mask");
                //замещаемый текст
                placeHolders = this.getPropertyValuesFromArray(masks, "placeHolder");
                commonStr = this.getCommonStartString(placeHolders);
                if (commonStr.length > info.caretPosition) {
                    this.setDomValueAndCaret(info.valueBeforeCaret + commonStr.substr(info.caretPosition, 1) + info.valueAfterCaret.slice(1), info.caretPosition + 1);
                }
            }
        }
    },

    maskConfig: {
        definitions: {
            //цифры
            "9": {
                re: "[0-9]"
            },
            //кириллица
            "к": {
                re: "[а-яА-ЯёЁ]"
            },
            //латинские
            "l": {
                re: "[a-zA-Z]"
            },
            //любая буква
            "c": {
                re: "[а-яА-ЯёЁa-zA-Z]"
            },
            //любая буква или цифра
            "#": {
                re: "[а-яА-ЯёЁA-Za-z0-9]"
            }
        },
        placeHolderChar: "_"
    },

    mask: [],

    /**
	 * Инициализирует параметры элемента управления
	 * @protected
	 * @overridden
	 */
    init: function () {
        this.callParent(arguments);
        this.reSpecChars = [
			"\\", "(", ")", "+"
        ];
        this.addEvents(/**
		 * @event paste
		 * Событие - вставка из буфера обмена
		 */
			"paste");
        this.on("paste", this.onPaste, this);
    },

    /**
	 * Обработчик события изменения маски ввода
	 * @protected
	 * */
    setMasks: function (value) {
        this.masks = [];
        if (Ext.isEmpty(value)) {
            value = {
                formats: []
            };
        }
        Terrasoft.each(value.formats, function (format, i) {
            this.masks[i] = this.getMaskByFormat(format);
        }, this);
        this.changeValue(this.value);
    },

    /**
	 * Возвращает конфигурацию привязки к модели. Реализует интерфейс миксина {@link Terrasoft.Bindable}.
	 * @overridden
	 */
    getBindConfig: function () {
        var bindConfig = this.callParent(arguments);
        var multiMaskEditBindConfig = {
            mask: {
                changeMethod: "setMasks"
            }
        };
        Ext.apply(bindConfig, multiMaskEditBindConfig);
        return bindConfig;
    },


    getMaskByFormat: function (format) {
        var mask = {};
        var matches = [];
        var placeHolderChar;
        var placeHolder = "";
        var def;
        var allRe = "";
        //TODO: exception не указан формат
        if (format) {
            Terrasoft.each(format.split(""), function (c) {
                def = this.maskConfig.definitions[c];
                if (def) {
                    allRe += def.re;
                    placeHolderChar = def.placeHolderChar || this.maskConfig.placeHolderChar || "_";
                    matches.push({
                        re: new RegExp(def.re),
                        placeHolderChar: placeHolderChar
                    });
                    //TODO: exeption если пустой placeHolderChar
                    placeHolder += placeHolderChar;
                } else {
                    placeHolder += c;
                    matches.push(c);
                    if (this.reSpecChars.indexOf(c) > 0) {
                        allRe += "\\" + c;
                    } else {
                        allRe += c;
                    }
                }
            }, this);
            mask.placeHolder = placeHolder;
            mask.matches = matches;
            if (allRe !== "") {
                mask.re = {};
                mask.re.full = new RegExp("^" + allRe + "$");
            }
        }
        return mask;
    },

    /**
	 * удаляет из конца строки символы подстановки
	 * @param value
	 */
    removeEndPlaceHolders: function (value) {
        if (!Ext.isEmpty(value)) {
            var pos;
            //убираем незначищие символы в конце строки
            for (var i = (value.length - 1) ; i >= 0; i--) {
                //TODO: подумать как сделать проверку с разными placeHolderChar
                if (value[i] !== this.maskConfig.placeHolderChar) {
                    break;
                }
                pos = i;
            }
            if (pos === 0) {
                value = "";
            } else if (pos) {
                value = value.slice(0, pos);
            }
        }
        return value;
    },

    /**
	 * проверка допустимости вставки символа
	 * @param mask - объект маски
	 * @param c - символ
	 * @param pos - позиция
	 * @param textBefore - текст до вставки
	 * @param textReplaced - заменяемый текст
	 * @param textAfter - текст после вставки
	 * @param allowAutoFill - если true, то позволяет автоматически добавлять нужный текст из маски
	 * @returns {*}
	 */
    maskValidateByInsChar: function (mask, c, pos, textBefore, textReplaced, textAfter, allowAutoFill) {
        var replacedLength = textReplaced.length;
        if (replacedLength > 0) {
            textAfter = mask.placeHolder.slice(pos, pos + textReplaced.length) + textAfter;
        }
        var value = textBefore + textAfter;
        var maskValidate;
        var match;

        if (!Ext.isEmpty(textAfter)) {
            match = mask.matches[pos];
            if (match && !match.re && mask.matches[pos] === c) {
                return {
                    value: value,
                    pos: pos,
                    result: this.maskValidateValue(mask, value)
                };
            }
        }
        value = textBefore + c + textAfter;
        match = mask.matches[pos];
        if (match) {
            //если вставляем в место ввода
            if (match.re) {
                // и там еще ничего не введено
                //TODO: подумать как вставлять со сдвигом введенных значений
                if (textAfter[0] === mask.placeHolder.substr(pos, 1)) {
                    value = textBefore + c + textAfter.substring(1);
                    maskValidate = this.maskValidateValue(mask, value);
                    if (maskValidate.isValid) {
                        return {
                            value: value,
                            pos: pos,
                            result: maskValidate
                        };
                    }
                }
            }
        }
        maskValidate = this.maskValidateValue(mask, value);
        if (maskValidate.isValid) {
            return {
                value: value,
                pos: pos,
                result: maskValidate
            };
        }
        //if ((textBefore + textAfter).length > pos) {
        if (match && !match.re && allowAutoFill && pos < mask.placeHolder.length) {
            var result = this.maskValidateByInsChar(mask, c, pos + 1, textBefore + match, textReplaced, textAfter.substring(1), allowAutoFill);
            if (result) {
                return result;
            }
            return this.maskValidateByInsChar(mask, c, pos + 1, textBefore + match, textReplaced, textAfter.substring(2), allowAutoFill);
        }
        //}
    },

    /**
	 * форматирует значение по маске при вставке символа
	 * @param c - вставляемый символ
	 * @param pos - позиция
	 * @param textBefore - текст до вставляемой позиции
	 * @param textAfter - текст после вставляемой позиции
	 * @param allowAutoFill - если true, то позволяет автоматически добавлять текст из маски
	 * @returns {*}
	 */
    formatValueByInsChar: function (c, pos, textBefore, textReplaced, textAfter, allowAutoFill) {
        var maskValidation;
        var bestResults = [];
        Terrasoft.each(this.masks, function (item) {
            maskValidation = this.maskValidateByInsChar(item, c, pos, textBefore, textReplaced, textAfter, allowAutoFill);
            if (maskValidation) {
                maskValidation.mask = item;
                if (bestResults.length === 0) {
                    bestResults.push(maskValidation);
                } else if (maskValidation.pos < bestResults[0].pos) {
                    bestResults = [maskValidation];
                }
            }
        }, this);
        if (bestResults.length > 0) {
            maskValidation = bestResults[0];
            //TODO: сделать метод установки нового значения и вынести туда форматирование
            var formatValue = this.formatValue(maskValidation.value);
            formatValue.insPos = maskValidation.pos;
            return formatValue;
        }
    },

    /**
	 * проверить значение маской
	 * @param mask
	 * @param value
	 * @returns {*}
	 */
    maskValidateValue: function (mask, value) {
        var match;
        var matchPos = 0;
        if (mask.re.full.test(value)) {
            return {
                matchPos: value.length,
                inputPos: value.length,
                isValid: true,
                isComplete: true
            };
        }
        var result = {
            matchPos: 0,
            inputPos: 0,
            isValid: true,
            isComplete: false
        };
        value = this.removeEndPlaceHolders(value);

        if (Ext.isEmpty(value)) {
            return result;
        } else {
            Terrasoft.each(value.split(""), function (c, i) {
                match = mask.matches[i];
                if (!match) {
                    result = {
                        isValid: false,
                        isComplete: false
                    };
                    return false;
                } else if (match.re) {
                    if (!match.re.test(c)) {
                        if (match.placeHolderChar === c) {
                            if (!result.inputPos) {
                                result.inputPos = i;
                            }
                        } else {
                            result = {
                                isValid: false,
                                isComplete: false
                            };
                            return false;
                        }
                    }
                } else if (c !== match) {
                    result = {
                        isValid: false,
                        isComplete: false
                    };
                    return false;
                }
                matchPos = i;
            }, this);
            result.matchPos = matchPos;
            if (!result.inputPos) {
                if (result.isValid) {
                    result.inputPos = result.matchPos + 1;
                } else {
                    result.inputPos = value.length;
                }
            }
        }
        return result;
    },

    /**
	 * получить совпадения с масками
	 * @param value
	 * @returns {{matches: Array, matchPos: number, inputPos: number}}
	 */
    getMatchesByValue: function (value) {
        var matches = [];
        var matchPos = 0;
        var inputPos = 0;
        var maskValidation;
        var isComplete = false;
        Terrasoft.each(this.masks, function (mask) {
            maskValidation = this.maskValidateValue(mask, value);
            if (maskValidation.isValid) {
                if (maskValidation.isComplete) {
                    isComplete = true;
                }
                matches.push({
                    mask: mask,
                    validation: maskValidation
                });
                if (matchPos < maskValidation.matchPos) {
                    matchPos = maskValidation.matchPos;
                }
                if (inputPos < maskValidation.inputPos) {
                    inputPos = maskValidation.inputPos;
                }
            }
        }, this);
        return {
            matches: matches,
            matchPos: matchPos,
            inputPos: inputPos,
            isComplete: isComplete
        };
    },

    /**
	 * получить совпадения для массива строк
	 * @param values
	 * @returns {*}
	 */
    //TODO: вынести в отдельный модуль
    getCommonStartString: function (values) {
        var valuesCount = values.length;
        if (valuesCount === 0) {
            return "";
        } else if (valuesCount === 1) {
            return values[0];
        }
        var commonStr = "";
        var minLen = values[0].length;
        Terrasoft.each(values, function (value) {
            minLen = Math.min(minLen, value.length);
        });
        var isMatch;
        var c;
        for (var i = 0; i < minLen; i++) {
            isMatch = true;
            for (var j = 1; j < valuesCount; j++) {
                isMatch = values[j][i] === values[j - 1][i];
                if (!isMatch) {
                    break;
                }
                c = values[j][i];
            }
            if (isMatch) {
                commonStr += c;
            } else {
                return commonStr;
            }
        }
        return commonStr;
    },

    /**
	 * получить из массива объектов массив значений их свойств
	 * @param a
	 * @param name
	 * @returns {Array}
	 */
    //TODO: вынести в отдельный модуль
    getPropertyValuesFromArray: function (a, name) {
        var result = [];
        Terrasoft.each(a, function (e) {
            result.push(e[name]);
        }, this);
        return result;
    },

    /**
	 * Инициализирует подписку на DOM-события элемента управления
	 * @overridden
	 * @protected
	 */
    initDomEvents: function () {
        this.callParent(arguments);
        var el = this.getEl();
        el.on({
            "paste": {
                fn: this.onPaste,
                scope: this
            }
        });
    },

    /**
	 * пользовательская функция которая обрабатывает значение вставляемое из буфера обмена
	 */
    onBeforePasteFormatValue: Ext.emptyFn,

    /**
	 * событие происходит при вставке из буфера обмена
	 */
    //TODO: добавление события вынести в mixin, обработчик оставить
    onPaste: function (e) {
        if (Ext.isEmpty(this.masks)) {
            return;
        }
        var getSplitText = function (v, p) {
            return {
                pos: p,
                before: v.substr(0, p),
                after: v.substr(p)
            };
        };
        e.preventDefault();
        if (e.browserEvent.clipboardData && e.browserEvent.clipboardData.getData) {
            if (/text\/plain/.test(e.browserEvent.clipboardData.types)) {
                var clipBoardValue = e.browserEvent.clipboardData.getData("text/plain");
                clipBoardValue = this.onBeforePasteFormatValue(clipBoardValue) || clipBoardValue;
                if (Ext.isEmpty(clipBoardValue)) {
                    return;
                }
                var domEl = e.getTarget();
                var info = this.getInputInfo(domEl);
                var pos = info.caretPosition;
                var splitText = {
                    before: info.valueBeforeCaret,
                    after: info.valueAfterCaret
                };
                var newValue = splitText.before + splitText.after;
                Terrasoft.each(clipBoardValue.split(""), function (c) {
                    var formatValue = this.formatValueByInsChar(c, pos, splitText.before, "", splitText.after, true);
                    if (formatValue) {
                        newValue = formatValue.value;
                        pos = formatValue.insPos + 1;
                        splitText = getSplitText(newValue, pos);
                    }
                }, this);
                domEl.value = newValue;
            }
        }
        return;
    },

    /**
	 * форматировать значение с учетом маски
	 * @param value
	 * @returns {*}
	 */
    formatValue: function (value) {
        var newValue = value;
        var placeHolders;
        if (Ext.isEmpty(value)) {
            placeHolders = this.getPropertyValuesFromArray(this.masks, "placeHolder");
            newValue = this.getCommonStartString(placeHolders);
            if (!Ext.isEmpty(newValue)) {
                return this.formatValue(newValue);
            }
            return {
                pos: 0,
                value: "",
                isComplete: false
            };
        }
        var matches = this.getMatchesByValue(value);
        if (matches.matches.length === 0) {
            if (matches.matchPos > 0) {
                newValue = value.substr(0, matches.matchPos + 1);
            } else {
                //newValue = "";
                return {
                    pos: 0,
                    value: value,
                    isComplete: false
                };
            }
            return this.formatValue(newValue);
        }
        var masks = this.getPropertyValuesFromArray(matches.matches, "mask");
        placeHolders = this.getPropertyValuesFromArray(masks, "placeHolder");
        var afterText = this.getCommonStartString(placeHolders).substr(matches.matchPos + 1);
        newValue = value.substr(0, matches.matchPos + 1) + afterText;
        matches = this.getMatchesByValue(newValue);
        return {
            pos: matches.inputPos,
            value: newValue,
            isComplete: matches.isComplete
        };
    },

    /**
	 * устанавливает значение в DOM и двигает курсор
	 * @param value
	 * @param caretPosition - позиция курсора, если не задано вычисляется автоматически
	 */
    setDomValueAndCaret: function (value, caretPosition) {
        var formatValue = this.formatValue(value);
        if (!this.validationInfo.isValid && formatValue.isComplete) {
            var validationInfo = {
                isValid: true,
                invalidMessage: ""
            };
            this.setValidationInfo(validationInfo);
        }
        var el = this.getEl();
        if (el) {
            el.dom.value = formatValue.value;
            caretPosition = caretPosition || formatValue.pos;
            Terrasoft.utils.dom.setCaretPosition(el.dom, caretPosition);
        }
    },

    /**
	 * Устанавливает значение value в DOM
	 * @param {String} value
	 * @protected
	 * @virtual
	 */
    setDomValue: function (value) {
        this.setDomValueAndCaret(value);
    },

    /**
	 * Сравнивает значение параметра value и значение элемента управления,
	 * если они не равны вызывается событие 'change' и устанавливается новое значение.
	 * @protected
	 * @param  {String} value
	 * @return {Boolean} true - если значение изменилось, в противном случае - false
	 */
    changeValue: function (value) {

        if (!Ext.isEmpty(this.masks)) {
            var formatValue = this.formatValue(value);
            if (formatValue.value === this.formatValue(null).value) {
                value = null;
                formatValue.isComplete = true;
                var el = this.getEl();
                if (el) {
                    el.dom.value = "";
                }
            }
            var validationInfo = this.getValidationInfo(formatValue);
            this.setValidationInfo(validationInfo);
        }
        return this.callParent(arguments);
    }

    /**
	 * Подписывается на события модели и при необходимости подписывается на изменение привязываемого свойства
	 * элемента управления для типа Property
	 * @protected
	 * @virtual
	 * @param {Object} binding Объект, описывающий параметры привязки свойства элемента управления к модели
	 * @param {String} property Имя свойства привязываемого элемента управления
	 * @param {Terrasoft.BaseViewModel} model Модель данных к которой привязывается элемент управления
	 * @param {Boolean} useCalculatedValue (optional) Использовать для получения данных результат выполнения метода,
	 * вместо значения аттрибута модели. В этом случае подписка на аттрибут модели не выполняется
	 */

});