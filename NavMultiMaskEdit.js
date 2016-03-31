/**
 * @class Terrasoft.controls.MultiMaskEdit
 * ������� ���������� � ������ �����
 */
Ext.define("MultiMaskEdit", {
    extend: "Terrasoft.TextEdit",

    alternateClassName: "Terrasoft.MultiMaskEdit",

    /**
	 * ������������ �������� � ������ �����������
	 * @public
	 * @type {Terrasoft.Align}
	 */
    textAlign: Terrasoft.Align.LEFT,

    /**
	 * ���������� ������� ��������� ��������� ������.
	 * ��� ��������� ������ ����� ������ �������� ������������� � ������������� �����
	 * @protected
	 * @overridden
	 */
    onFocus: function (e) {
        this.callParent(arguments);
        var value = this.getTypedValue();
        this.setDomValue(value);
    },

    /**
	 * �������� �������� ���� ����� ������������ � ������ �������� ����������
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
        return "������������ �����";
    },
    /**
	 * ���������� ������� ������� �������.
	 * ������������� ���� �� ���������� ����������� �������� ��� �������� �� ��������������� ������� numberRe.
	 * ����� ��������������, ������ �������� ������ ����� ��������� �������.
	 * @protected
	 * @overridden
	 * @param  {Event} e DOM ������� keypress
	 * @param  {String} type (optional) ���� �������� �� ����� ���� �������������� ��� ��� ������ �����, ���� ������
	 * �������� Terrasoft.DataValueType.FLOAT ���� �������������� ��� ��� �������� �����
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
	 * ���������� ������� "������� ������" � ���� ����� �������� ����������
	 * @protected
	 */
    //TODO: ��������� ���� � �������� ������
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
            //��������� ���
            if (info.valueBeforeCaret === "" && info.valueAfterCaret === "") {
                this.setDomValue("");
            }
                //���� ���������� �����
            else if (info.selectedTextLength > 0) {
                //��������� ����� ������
                if (Ext.isEmpty(info.valueAfterCaret)) {
                    this.setDomValue(this.removeEndPlaceHolders(info.valueBeforeCaret));
                } else {
                    //��� ���������� �� ������ �� ����������
                    matches = this.getMatchesByValue(info.valueBeforeCaret);
                    if (matches.matches.length === 0) {
                        return;
                    }
                    //�������� �����
                    masks = this.getPropertyValuesFromArray(matches.matches, "mask");
                    //���������� �����
                    placeHolders = this.getPropertyValuesFromArray(masks, "placeHolder");
                    var replaceText = this.getCommonStartString(placeHolders).substr(info.caretPosition, info.selectedTextLength);
                    if (replaceText.length === info.selectedTextLength) {
                        this.setDomValue(info.valueBeforeCaret + replaceText + info.valueAfterCaret);
                    }
                }
            } else if (key === e.BACKSPACE && !Ext.isEmpty(info.valueBeforeCaret)) {
                //TODO: ������� ������ ���� � �����, ���� ��� ����� ���� � formatValue()
                //var beforeText = info.valueBeforeCaret.slice(0, -1);
                //��� ����������
                matches = this.getMatchesByValue(info.valueBeforeCaret);
                if (matches.matches.length === 0) {
                    return;
                }
                //�������� �����
                masks = this.getPropertyValuesFromArray(matches.matches, "mask");
                //���������� �����
                placeHolders = this.getPropertyValuesFromArray(masks, "placeHolder");
                commonStr = this.getCommonStartString(placeHolders);
                if (commonStr.length >= info.caretPosition) {
                    this.setDomValueAndCaret(info.valueBeforeCaret.slice(0, -1) + commonStr.substr(info.caretPosition - 1, 1) + info.valueAfterCaret, info.caretPosition - 1);
                }
            } else if (key === e.DELETE && !Ext.isEmpty(info.valueAfterCaret)) {
                //TODO: ������� ������ ���� � �����, ���� ��� ����� ���� � formatValue()
                //��� ����������
                matches = this.getMatchesByValue(info.valueBeforeCaret);
                if (matches.matches.length === 0) {
                    return;
                }
                //�������� �����
                masks = this.getPropertyValuesFromArray(matches.matches, "mask");
                //���������� �����
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
            //�����
            "9": {
                re: "[0-9]"
            },
            //���������
            "�": {
                re: "[�-��-߸�]"
            },
            //���������
            "l": {
                re: "[a-zA-Z]"
            },
            //����� �����
            "c": {
                re: "[�-��-߸�a-zA-Z]"
            },
            //����� ����� ��� �����
            "#": {
                re: "[�-��-߸�A-Za-z0-9]"
            }
        },
        placeHolderChar: "_"
    },

    mask: [],

    /**
	 * �������������� ��������� �������� ����������
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
		 * ������� - ������� �� ������ ������
		 */
			"paste");
        this.on("paste", this.onPaste, this);
    },

    /**
	 * ���������� ������� ��������� ����� �����
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
	 * ���������� ������������ �������� � ������. ��������� ��������� ������� {@link Terrasoft.Bindable}.
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
        //TODO: exception �� ������ ������
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
                    //TODO: exeption ���� ������ placeHolderChar
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
	 * ������� �� ����� ������ ������� �����������
	 * @param value
	 */
    removeEndPlaceHolders: function (value) {
        if (!Ext.isEmpty(value)) {
            var pos;
            //������� ���������� ������� � ����� ������
            for (var i = (value.length - 1) ; i >= 0; i--) {
                //TODO: �������� ��� ������� �������� � ������� placeHolderChar
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
	 * �������� ������������ ������� �������
	 * @param mask - ������ �����
	 * @param c - ������
	 * @param pos - �������
	 * @param textBefore - ����� �� �������
	 * @param textReplaced - ���������� �����
	 * @param textAfter - ����� ����� �������
	 * @param allowAutoFill - ���� true, �� ��������� ������������� ��������� ������ ����� �� �����
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
            //���� ��������� � ����� �����
            if (match.re) {
                // � ��� ��� ������ �� �������
                //TODO: �������� ��� ��������� �� ������� ��������� ��������
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
	 * ����������� �������� �� ����� ��� ������� �������
	 * @param c - ����������� ������
	 * @param pos - �������
	 * @param textBefore - ����� �� ����������� �������
	 * @param textAfter - ����� ����� ����������� �������
	 * @param allowAutoFill - ���� true, �� ��������� ������������� ��������� ����� �� �����
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
            //TODO: ������� ����� ��������� ������ �������� � ������� ���� ��������������
            var formatValue = this.formatValue(maskValidation.value);
            formatValue.insPos = maskValidation.pos;
            return formatValue;
        }
    },

    /**
	 * ��������� �������� ������
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
	 * �������� ���������� � �������
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
	 * �������� ���������� ��� ������� �����
	 * @param values
	 * @returns {*}
	 */
    //TODO: ������� � ��������� ������
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
	 * �������� �� ������� �������� ������ �������� �� �������
	 * @param a
	 * @param name
	 * @returns {Array}
	 */
    //TODO: ������� � ��������� ������
    getPropertyValuesFromArray: function (a, name) {
        var result = [];
        Terrasoft.each(a, function (e) {
            result.push(e[name]);
        }, this);
        return result;
    },

    /**
	 * �������������� �������� �� DOM-������� �������� ����������
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
	 * ���������������� ������� ������� ������������ �������� ����������� �� ������ ������
	 */
    onBeforePasteFormatValue: Ext.emptyFn,

    /**
	 * ������� ���������� ��� ������� �� ������ ������
	 */
    //TODO: ���������� ������� ������� � mixin, ���������� ��������
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
	 * ������������� �������� � ������ �����
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
	 * ������������� �������� � DOM � ������� ������
	 * @param value
	 * @param caretPosition - ������� �������, ���� �� ������ ����������� �������������
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
	 * ������������� �������� value � DOM
	 * @param {String} value
	 * @protected
	 * @virtual
	 */
    setDomValue: function (value) {
        this.setDomValueAndCaret(value);
    },

    /**
	 * ���������� �������� ��������� value � �������� �������� ����������,
	 * ���� ��� �� ����� ���������� ������� 'change' � ��������������� ����� ��������.
	 * @protected
	 * @param  {String} value
	 * @return {Boolean} true - ���� �������� ����������, � ��������� ������ - false
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
	 * ������������� �� ������� ������ � ��� ������������� ������������� �� ��������� �������������� ��������
	 * �������� ���������� ��� ���� Property
	 * @protected
	 * @virtual
	 * @param {Object} binding ������, ����������� ��������� �������� �������� �������� ���������� � ������
	 * @param {String} property ��� �������� �������������� �������� ����������
	 * @param {Terrasoft.BaseViewModel} model ������ ������ � ������� ������������� ������� ����������
	 * @param {Boolean} useCalculatedValue (optional) ������������ ��� ��������� ������ ��������� ���������� ������,
	 * ������ �������� ��������� ������. � ���� ������ �������� �� �������� ������ �� �����������
	 */

});