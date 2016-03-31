define("CommandLineModule", ["CommandLineModuleResources", "StorageUtilities", "ProcessModuleUtilities",
		"performancecountermanager", "ProcessProgressSpinnerImage"], function (resources, storageUtilities,
			ProcessModuleUtilities, performanceCounterManager, ProcessProgressSpinnerImage) {

		    String.prototype.splice = function (start, delCount, newSubStr) {
		        return this.slice(0, start) + newSubStr + this.slice(start + Math.abs(delCount));
		    };

		    function createConstructor(context) {
		        var topCount = 10;
		        var Ext = context.Ext;
		        var sandbox = context.sandbox;
		        var Terrasoft = context.Terrasoft;

		        function getDefaultCList(commandList, currentSchemaName) {
		            var list = new Terrasoft.Collection();
		            var tempList = commandList.filter(function (item) {
		                return (item.Code === "search" && item.HintType === 2 &&
                                item.SubjectName === currentSchemaName);
		            });
		            if (tempList.getCount() !== 0) {
		                list.add(tempList.getKeys()[0], tempList.getItems()[0]);
		            }
		            if (currentSchemaName !== "Contact") {
		                tempList = commandList.filter(function (item) {
		                    return (item.Code === "search" && item.HintType === 2 &&
                                item.SubjectName === "Contact");
		                });
		                list.add(tempList.getKeys()[0], tempList.getItems()[0]);
		            }
		            if (currentSchemaName !== "Account") {
		                tempList = commandList.filter(function (item) {
		                    return (item.Code === "search" && item.HintType === 2 && item.SubjectName === "Account");
		                });
		                list.add(tempList.getKeys()[0], tempList.getItems()[0]);
		            }
		            return list;
		        }


		        function tryGetModule(schemaName) {
		            var result = null;
		            var key = schemaName === "SocialMessage" ? "ESNFeed" : schemaName;
		            Terrasoft.each(Terrasoft.configuration.ModuleStructure, function (item) {
		                if (item && item.entitySchemaName && item.entitySchemaName === key) {
		                    result = item;
		                }
		            });
		            return result;
		        }

		        function tryGetUrl(schemaName, urlType, columnTypeCode, mode) {
		            var module = tryGetModule(schemaName);
		            var url = "";
		            switch (urlType) {
		                case "section":
		                    url = module.sectionModule + "/";
		                    if (module.sectionSchema) {
		                        url += module.sectionSchema + "/";
		                    }
		                    break;
		                case "card":
		                    if (module.cardSchema) {
		                        url += module.cardModule + "/";
		                        var attribute = module.attribute;
		                        if (columnTypeCode && attribute) {
		                            var pages = module.pages;
		                            for (var i = 0; i < pages.length; i++) {
		                                var page = pages[i];
		                                if (page.name === columnTypeCode) {
		                                    if (page.cardSchema) {
		                                        url += page.cardSchema + "/add/" + attribute + "/" + page.UId;
		                                    } else {
		                                        url += module.cardSchema + "/add/" + attribute + "/" + page.UId;
		                                    }
		                                }
		                            }
		                        } else {
		                            if (mode === "add") {
		                                url += module.cardSchema + "/add";
		                            } else {
		                                url += module.cardSchema + "/";
		                            }
		                        }
		                    } else {
		                        url = module.sectionModule + "/" + module.sectionSchema + "/";
		                    }
		                    break;
		                default:
		                    break;
		            }
		            return url;
		        }

		        function tryGetOpenCardConfig(schemaName, urlType, columnTypeCode) {
		            var moduleStructure = Terrasoft.configuration.ModuleStructure;
		            var module = moduleStructure[schemaName];
		            var config = {
		                values: {
		                    TypeColumnName: "",
		                    TypeColumnValue: Terrasoft.GUID_EMPTY,
		                    EditPageName: module.cardSchema
		                }
		            };
		            var attribute = module.attribute;
		            if (columnTypeCode && attribute) {
		                var pages = module.pages;
		                for (var i = 0; i < pages.length; i++) {
		                    var page = pages[i];
		                    if (page.name === columnTypeCode) {
		                        if (page.cardSchema) {
		                            config.values.EditPageName = page.cardSchema;
		                        }
		                        config.values.TypeColumnName = attribute;
		                        config.values.TypeColumnValue = page.UId;
		                    }
		                }
		            }
		            return Ext.create("Terrasoft.BaseViewModel", config);
		        }

		        function executeCommand(command, mainParam, addParam) {
		            var newState, state, currentState, filterState;
		            var url = "";
		            switch (command) {
		                case "goto":
		                    url = tryGetUrl(mainParam, "section");
		                    if (addParam.value && addParam.valueId) {
		                        var filtersStorage = Terrasoft.configuration.Storage.Filters =
                                    Terrasoft.configuration.Storage.Filters || {};
		                        var sessionStorageFilters = filtersStorage[mainParam + "SectionV2"] =
                                    filtersStorage[mainParam + "SectionV2"] || {};
		                        sessionStorageFilters.FolderFilters = [{
		                            folderId: addParam.valueId,
		                            folderInfo: addParam.value
		                        }];
		                        state = sandbox.publish("GetHistoryState");
		                        currentState = state.state || {};
		                        newState = Terrasoft.deepClone(currentState);
		                        newState.filterState = filterState;
		                        sandbox.publish("PushHistoryState", { hash: url, stateObj: newState });
		                    } else {
		                        sandbox.publish("PushHistoryState", { hash: url });
		                    }
		                    break;
		                case "search":
		                    if (addParam.valueId) {
		                        url = tryGetUrl(mainParam, "card") + "edit/" + addParam.valueId;
		                        sandbox.publish("PushHistoryState", { hash: url });
		                    } else if (addParam.value) {
		                        url = tryGetUrl(mainParam, "section");
		                        filterState = {};
		                        filterState.ignoreFixedFilters = true;
		                        filterState.ignoreFolderFilters = true;
		                        filterState.customFilterState = {};
		                        if (mainParam != "Contact") {
		                            filterState.customFilterState[addParam.columnName] = {
		                                value: addParam.value,
		                                displayValue: addParam.value
		                            };
		                        } else {
		                            filterState.customFilterState = {};
		                        }
		                        state = sandbox.publish("GetHistoryState");
		                        currentState = state.state || {};
		                        newState = Terrasoft.deepClone(currentState);
		                        newState.activeTab = "mainView";
		                        newState.filterState = filterState;
		                        newState.searchState = true;
		                        newState.moduleId = "ViewModule_SectionModule";

		                        if (mainParam != "Contact") {
		                            var tryFilterCurrentSection = sandbox.publish("FilterCurrentSection", {
		                                value: addParam.value,
		                                displayValue: addParam.value,
		                                schemaName: addParam.noSchema ? "" : mainParam
		                            });
		                        }

		                        if (!tryFilterCurrentSection) {
		                            var storage = Terrasoft.configuration.Storage.Filters =
                                        Terrasoft.configuration.Storage.Filters || {};
		                            var sessionFilters = storage[mainParam + "SectionV2"] = storage[mainParam + "SectionV2"] || {};
		                            if (mainParam != "Contact") {
		                                sessionFilters.CustomFilters = {
		                                    value: addParam.value,
		                                    displayValue: addParam.value,
		                                    primaryDisplayColumn: true
		                                };
		                            } else {
		                                sessionFilters.CustomFilters = {};
		                                filterValue = addParam.value;
		                                var filterValueCorrected = filterValue.splice(2, 0, "-");

		                                var filtersGroup = Terrasoft.createFilterGroup();
		                                filtersGroup.logicalOperation = Terrasoft.LogicalOperatorType.OR;

		                                var nameFilter = Terrasoft.createColumnFilterWithParameter(Terrasoft.ComparisonType.CONTAIN, addParam.columnName, addParam.value);
		                                filtersGroup.add('nameFilter', nameFilter);

		                                filterColumnName = "HomePhone";
		                                var HomePhonefilter = Terrasoft.createColumnFilterWithParameter(Terrasoft.ComparisonType.END_WITH, filterColumnName, filterValue);
		                                var HomePhonefilterCorrected = Terrasoft.createColumnFilterWithParameter(Terrasoft.ComparisonType.END_WITH, filterColumnName, filterValueCorrected);
		                                filtersGroup.add('HomePhonefilter', HomePhonefilter);
		                                filtersGroup.add('HomePhonefilterCorrected', HomePhonefilterCorrected);

		                                filterColumnName = "Phone";
		                                var Phonefilter = Terrasoft.createColumnFilterWithParameter(Terrasoft.ComparisonType.END_WITH, filterColumnName, filterValue);
		                                var PhonefilterCorrected = Terrasoft.createColumnFilterWithParameter(Terrasoft.ComparisonType.END_WITH, filterColumnName, filterValueCorrected);
		                                filtersGroup.add('Phonefilter', Phonefilter);
		                                filtersGroup.add('PhonefilterCorrected', PhonefilterCorrected);

		                                filterColumnName = "MobilePhone";
		                                var MobilePhonefilter = Terrasoft.createColumnFilterWithParameter(Terrasoft.ComparisonType.END_WITH, filterColumnName, filterValue);
		                                var MobilePhonefilterCorrected = Terrasoft.createColumnFilterWithParameter(Terrasoft.ComparisonType.END_WITH, filterColumnName, filterValueCorrected);
		                                filtersGroup.add('MobilePhonefilter', MobilePhonefilter);
		                                filtersGroup.add('MobilePhonefilterCorrected', MobilePhonefilterCorrected);

		                                sessionFilters.CustomFilters[filterColumnName] = {
		                                    value: filterValue,
		                                    displayValue: filterColumnName,
		                                    filter: filtersGroup.serialize({ serializeFilterManagerInfo: true })
		                                };

		                            }
		                            sandbox.publish("PushHistoryState", { hash: url, stateObj: newState });
		                        }
		                    } else {
		                        url = tryGetUrl(mainParam, "section");
		                        sandbox.publish("PushHistoryState", { hash: url });
		                    }
		                    break;
		                case "create":
		                    if (mainParam === "Macros") {
		                        url = "MacrosPageModule";
		                        state = sandbox.publish("GetHistoryState");
		                        currentState = state.state || {};
		                        newState = Terrasoft.deepClone(currentState);
		                        var defaultValues = {};
		                        if (addParam.columnName) {
		                            defaultValues[addParam.columnName] = addParam.value;
		                        }
		                        newState.defaultValues = defaultValues;
		                        var obj = { hash: url, stateObj: newState };
		                        sandbox.publish("PushHistoryState", obj);
		                    } else {
		                        var addCardConfig = tryGetOpenCardConfig(mainParam, "card", addParam.columnTypeCode, "add");
		                        addCardConfig.set("Tag", sandbox.id);
		                        require(["SysModuleEditManageModule"], function (module) {
		                            if (module) {
		                                module.Run({
		                                    sandbox: sandbox,
		                                    item: addCardConfig
		                                });
		                            }
		                        });
		                    }
		                    break;
		                case "startbp":
		                    if (addParam.value && addParam.valueId) {
		                        executeProcess(addParam.valueId);
		                    }
		                    break;
		                default:
		                    break;
		            }
		        }

		        function createViewConfig() {
		            return {
		                className: "Terrasoft.Container",
		                id: "commandLineContainer",
		                selectors: {
		                    el: "#commandLineContainer",
		                    wrapEl: "#commandLineContainer"
		                },
		                items: [
                            {
                                className: "Terrasoft.CommandLine",
                                bigSize: true,
                                placeholder: resources.localizableStrings.WhatCanIDoForYou,
                                value: { bindTo: "selectedValue" },
                                list: { bindTo: "commandList" },
                                typedValueChanged: { bindTo: "getCommandList" },
                                changeTypedValue: { bindTo: "onChangeTypedValue" },
                                typedValue: { bindTo: "commandInsertValue" },
                                selectionText: { bindTo: "commandSelectionText" },
                                commandLineExecute: { bindTo: "executeCommand" },
                                change: { bindTo: "valueChanged" },
                                markerValue: "command-line",
                                minSearchCharsCount: 3,
                                searchDelay: 350,
                                width: "100%"
                            }
		                ]
		            };
		        }

		        function createViewModel() {
		            var viewModel = Ext.create("Terrasoft.BaseViewModel", {
		                values: {
		                    selectedValue: null,
		                    commandInsertValue: null,
		                    commandSelectionText: "",
		                    selectedItem: null,
		                    commandList: new Terrasoft.Collection(),
		                    hintList: new Terrasoft.Collection()
		                },
		                methods: {
		                    clearData: function () {
		                        this.set("selectedValue", "");
		                        this.set("selectedItem", null);
		                        this.set("commandInsertValue", null);
		                    },
		                    valueChanged: function (item) {
		                        if (item) {
		                            if (item.value.substr(0, 4) === "comm" && this.commandList.contains(item.value)) {
		                                this.set("selectedItem", this.commandList.get(item.value));
		                                this.set("commandSelectionText", "");
		                            }
		                            if (item.value.substr(0, 4) === "hint" && this.hintList.contains(item.value)) {
		                                this.set("commandSelectionText", "");
		                            }
		                        }
		                    },
		                    onChangeTypedValue: function (item) {
		                        this.set("commandSelectionText", "");
		                        var selectItem = this.get("selectedItem");
		                        this.set("selectedValue", null);
		                        if (item && selectItem) {
		                            if (item.toLowerCase().indexOf(selectItem.Caption.toLowerCase()) === -1) {
		                                this.set("selectedItem", null);
		                                selectItem = this.get("selectedItem");
		                            }
		                        }
		                        var filter = item;
		                        var commandList = this.commandList;
		                        if (!selectItem) {
		                            var filteredCommandList = commandList.filter(
                                        function (item) {
                                            if (item.Caption.toLowerCase().indexOf(filter.toLowerCase().trim()) === 0 &&
                                                item.Caption.length === filter.length
                                                ) {
                                                return true;
                                            }
                                        }
                                    );
		                            if (filteredCommandList.getCount() === 1) {
		                                selectItem = filteredCommandList.getItems()[0];
		                                this.set("selectedItem", selectItem);
		                            }
		                        }
		                    }
		                }
		            });
		            return viewModel;
		        }

		        function callServiceMethod(ajaxProvider, methodName, callback, dataSend) {
		            var data = dataSend || {};
		            var requestUrl = Terrasoft.workspaceBaseUrl + "/rest/CommandLineService/" + methodName;
		            var request = ajaxProvider.request({
		                url: requestUrl,
		                headers: {
		                    "Accept": "application/json",
		                    "Content-Type": "application/json"
		                },
		                method: "POST",
		                jsonData: data,
		                callback: function (request, success, response) {
		                    var responseObject = {};
		                    if (success) {
		                        responseObject = Terrasoft.decode(response.responseText);
		                    }
		                    callback.call(this, responseObject);
		                },
		                scope: this
		            });
		            return request;
		        }

		        function createProcessSpinner() {
		            var body = Ext.getBody();
		            var bodySize = body.getViewSize();
		            var spinnerWidth = 30;
		            var spinnerPositionW = (bodySize.width - spinnerWidth) / 2;
		            var spinnerPositionH = (bodySize.height - spinnerWidth) / 2;
		            var dimension = "px";
		            return Ext.create("Terrasoft.Container", {
		                renderTo: body,
		                id: "processSpinnerContainer",
		                selectors: {
		                    wrapEl: "#processSpinnerContainer"
		                },
		                items: [{
		                    className: "Terrasoft.Container",
		                    id: "processSpinnerContainerInside",
		                    selectors: {
		                        wrapEl: "#processSpinnerContainerInside"
		                    },
		                    styles: {
		                        wrapStyles: {
		                            "margin-left": spinnerPositionW + dimension,
		                            "margin-top": spinnerPositionH + dimension
		                        }
		                    },
		                    items: [{
		                        className: "Terrasoft.ProgressSpinner",
		                        extraComponentClasses: "",
		                        width: spinnerWidth + dimension,
		                        extraStyle: ProcessProgressSpinnerImage.image
		                    }]
		                }]
		            });
		        }

		        function executeProcess(processName) {
		            ProcessModuleUtilities.executeProcess({
		                sysProcessName: processName
		            });
		        }

		        function init(callbackList) {
		            this.commandList = new Terrasoft.Collection();
		            this.commandsCollection = new Terrasoft.Collection();
		            this.mainParamCollection = new Terrasoft.Collection();
		            this.hintList = new Terrasoft.Collection();
		            this.selectedValue = null;
		            var commandList = this.commandList;
		            var commandsCollection = this.commandsCollection;
		            var mainParamCollection = this.mainParamCollection;
		            var ajaxProvider = this.ajaxProvider = Terrasoft.AjaxProvider;
		            var serviceCallback = function (response) {
		                if (instance.isDestroyed) { return; }
		                var list = commandList;
		                var listCommands = commandsCollection;
		                var listMainParam = mainParamCollection;
		                var responseArray = response.GetCommandListResult;
		                if (responseArray) {
		                    for (var i = 0; i < responseArray.length; i++) {
		                        list.add("comm" + responseArray[i].Id, responseArray[i]);
		                        if (responseArray[i].HintType === 2 || responseArray[i].HintType === 3) {
		                            var command = responseArray[i].CommandCaption;
		                            var mainParam = responseArray[i].MainParamCaption;
		                            if (!listCommands.contains(command)) {
		                                listCommands.add(command, {
		                                    Code: responseArray[i].Code,
		                                    Synonym: responseArray[i].HintType === 3
		                                });
		                            }
		                            if (!listMainParam.contains(mainParam)) {
		                                listMainParam.add(mainParam,
                                            {
                                                SubjectName: responseArray[i].SubjectName,
                                                ColumnName: responseArray[i].ColumnName,
                                                ColumnTypeCode: responseArray[i].ColumnTypeCode
                                            }
                                        );
		                            }
		                        }
		                    }
		                }
		                if (callbackList) {
		                    callbackList(this.commandList);
		                }
		            };
		            var keyGenerator = function (ajaxProvider, methodName) {
		                return {
		                    groupName: "CommandLineStorage",
		                    valueKey: methodName
		                };
		            };
		            var requestFunction = function (callback, ajaxProvider, methodName, dataSend) {
		                callServiceMethod(ajaxProvider, methodName, callback, dataSend);
		            };
		            storageUtilities.workRequestWithStorage(keyGenerator, requestFunction, serviceCallback, this, ajaxProvider,
                        "GetCommandList", serviceCallback);
		        }

		        function render(renderTo) {
		            var container = this.renderTo = renderTo;
		            if (!container.dom) {
		                return;
		            }
		            var ajaxProvider = this.ajaxProvider;
		            var commandList = this.commandList;
		            var commandsCollection = this.commandsCollection;
		            var mainParamCollection = this.mainParamCollection;
		            var hintList = this.hintList;
		            var currentSchemaName = sandbox.publish("GetSectionSchemaName");
		            if (!currentSchemaName) {
		                currentSchemaName = sandbox.publish("GetCardSchemaName");
		            }
		            sandbox.subscribe("ChangeCommandList", function () {
		                var callbackList = function (list) {
		                    commandList = list;
		                };
		                init(callbackList);
		            });
		            var viewConfig = createViewConfig();
		            var view = Ext.create(viewConfig.className || "Terrasoft.Container", viewConfig);
		            var viewModel = createViewModel();
		            viewModel.schemaName = currentSchemaName;
		            viewModel.commandList = commandList;
		            viewModel.hintList = hintList;
		            viewModel.getCommandList = function (filter) {
		                var list = this.get("commandList");
		                list.clear();
		                var lastRequest, suggestString, newSuggestion;
		                if (!filter) {
		                    return;
		                }
		                var obj = {};
		                var selectItem = this.get("selectedItem");
		                var schemaName = this.schemaName;
		                if (!selectItem) {
		                    var canBeCommand = (commandsCollection.filter(function (item, key) {
		                        return (key.toLowerCase().indexOf(filter.toLowerCase()) === 0) && !item.Synonym;
		                    })).getCount() > 0;
		                    var canBeMainParam = (mainParamCollection.filter(function (item, key) {
		                        return key.toLowerCase().indexOf(filter.toLowerCase()) === 0;
		                    })).getCount() > 0;
		                    var needSynonyms = !(canBeCommand || canBeMainParam);
		                    var filteredList = commandList.filter(function (item) {
		                        if (item.Caption.toLowerCase().indexOf(filter.toLowerCase()) > -1) {
		                            if (item.HintType === 1 || item.HintType === 2) {
		                                return true;
		                            }
		                            if (item.HintType === 3 && needSynonyms) {
		                                return true;
		                            }
		                        }
		                        return false;
		                    });
		                    filteredList.sort("MainParamCaption", Terrasoft.OrderDirection.ASC);
		                    filteredList.sort(null, null, function (obj1) {
		                        if (obj1.SubjectName === schemaName) {
		                            return -1;
		                        } else {
		                            return 1;
		                        }
		                    });
		                    var newCaption = "";
		                    if (filteredList.getCount() === 0) {
		                        filteredList = getDefaultCList(commandList, currentSchemaName);
		                        newCaption = filter;
		                    }
		                    filteredList.each(function (item, index) {
		                        if (index > topCount) {
		                            return false;
		                        }
		                        obj["comm" + item.Id] = {
		                            value: "comm" + item.Id,
		                            displayValue: newCaption ? item.Caption + " " + newCaption : item.Caption
		                        };
		                    });
		                    suggestString = "";
		                    if (filteredList.getCount() > 0) {
		                        newSuggestion = filteredList.getItems()[0].Caption;
		                        if (newSuggestion.toLowerCase().indexOf(filter.toLowerCase()) === 0) {
		                            suggestString = newSuggestion.substring(filter.length, newSuggestion.length);
		                        }
		                    }
		                    this.set("commandSelectionText", suggestString);
		                    list.clear();
		                    list.loadAll(obj);
		                } else {
		                    hintList.clear();
		                    var viewModel = this;
		                    var hintText = (filter.substr(selectItem.Caption.length, filter.length - 1)).trim();
		                    var subjectName = "";
		                    var hideHint = selectItem.Code === "create" || !Ext.isEmpty(selectItem.AdditionalParamValue);
		                    if (selectItem.Code === "goto") {
		                        subjectName = selectItem.SubjectName + "Folder";
		                    } else if (selectItem.Code === "run") {
		                        subjectName = "runnableHint";
		                    } else {
		                        subjectName = selectItem.SubjectName;
		                    }
		                    if (!hideHint) {
		                        if (lastRequest) {
		                            ajaxProvider.abort(lastRequest);
		                        }
		                        lastRequest = callServiceMethod(ajaxProvider, "GetHintList", function (response) {
		                            if (instance.isDestroyed) { return; }
		                            var boxList = list;
		                            var hints = hintList;
		                            var hintArray = response.GetHintListResult;
		                            if (Ext.isEmpty(hintArray)) {
		                                return;
		                            }
		                            for (var i = 0; i < hintArray.length && i <= topCount; i++) {
		                                var uniqueKey = Terrasoft.generateGUID();
		                                var displayValue = selectItem.Caption + " " + hintArray[i].Key;
		                                var value = Terrasoft.deepClone(selectItem);
		                                value.AdditionalParamValue = hintArray[i].Key;
		                                value.AdditionalParamValueId = hintArray[i].Value;
		                                hints.add("hint" + uniqueKey, value);
		                                obj["hint" + uniqueKey] = { value: "hint" + uniqueKey, displayValue: displayValue };
		                            }
		                            suggestString = "";
		                            if (hintArray.length > 0) {
		                                newSuggestion = selectItem.Caption + " " + hintArray[0].Key;
		                                if (newSuggestion.toLowerCase().indexOf(filter.toLowerCase()) === 0) {
		                                    suggestString = newSuggestion.substring(filter.length, newSuggestion.length);
		                                }
		                            }
		                            viewModel.set("commandSelectionText", suggestString);
		                            boxList.clear();
		                            boxList.loadAll(obj);
		                        }, { "subjectName": subjectName, "hintText": hintText });
		                    } else {
		                        if (selectItem) {
		                            obj["comm" + selectItem.Id] = {
		                                value: "comm" + selectItem.Id,
		                                displayValue: selectItem.Caption
		                            };
		                            suggestString = "";
		                            newSuggestion = selectItem.Caption;
		                            if (newSuggestion.toLowerCase().indexOf(filter.toLowerCase()) === 0) {
		                                suggestString = newSuggestion.substring(filter.length, newSuggestion.length);
		                            }
		                            this.set("commandSelectionText", suggestString);
		                            list.clear();
		                            list.loadAll(obj);
		                        }
		                    }
		                }
		            };
		            viewModel.executeCommand = function (input) {
		                if (!input) {
		                    return;
		                }
		                var suggestion = this.get("commandSelectionText");
		                if (suggestion) {
		                    input += suggestion;
		                }
		                var inputArray = input.split(" ");
		                var command, mainParam, valueId, columnName, tempList, subjectName, columnTypeCode, macros;
		                var i = 0;
		                var additionValue = "";
		                var macrosText = "";
		                var predicateFilterEntry = function (item) {
		                    return item.Caption.toLowerCase().indexOf(macrosText.toLowerCase()) === 0;
		                };
		                var predicateFilterMatch = function (item) {
		                    return item.Caption.toLowerCase() === macrosText.toLowerCase();
		                };
		                while (i < inputArray.length) {
		                    while (!macros && inputArray.length > i) {
		                        macrosText += " " + inputArray[i++];
		                        macrosText = macrosText.trim();
		                        tempList = commandList.filter(predicateFilterEntry);
		                        if (tempList.getCount() === 1) {
		                            var selectedItem = tempList.getItems()[0];
		                            if (selectedItem.Caption.toLowerCase() === macrosText.toLowerCase()) {
		                                macros = tempList.getItems()[0];
		                            }
		                        }
		                    }
		                    while (inputArray.length > i) {
		                        additionValue += inputArray[i++] + " ";
		                    }
		                    additionValue = additionValue.trim();
		                    if (!macros && inputArray.length === i && tempList.getCount() > 0) {
		                        tempList = commandList.filter(predicateFilterMatch);
		                        if (tempList.getCount() === 1) {
		                            macros = tempList.getItems()[0];
		                        }
		                    }
		                }
		                if (macros) {
		                    columnName = macros.ColumnName;
		                    columnTypeCode = macros.ColumnTypeCode;
		                    command = macros.Code;
		                    mainParam = macros.SubjectName;
		                    var addValue;
		                    if (macros.HintType === 1 && macros.AdditionalParamValue) {
		                        switch (command) {
		                            case "search":
		                            case "goto":
		                                addValue = macros.AdditionalParamValue.split(";");
		                                valueId = addValue[0];
		                                additionValue = addValue[1];
		                                break;
		                            case "startbp":
		                                addValue = macros.AdditionalParamValue.split(";");
		                                valueId = addValue[0];
		                                additionValue = addValue[1];
		                                var esq = Ext.create("Terrasoft.EntitySchemaQuery", {
		                                    rootSchemaName: "VwSysProcess"
		                                });
		                                esq.addColumn("Id", "Id");
		                                esq.addColumn("Name", "Name");
		                                esq.filters.add("recordId", Terrasoft.createColumnFilterWithParameter(
                                            Terrasoft.ComparisonType.EQUAL, "Id", valueId));
		                                esq.getEntityCollection(function (result) {
		                                    if (instance.isDestroyed) {
		                                        return;
		                                    }
		                                    if (result.collection.getCount() > 0) {
		                                        var entities = result.collection.getItems();
		                                        valueId = entities[0].values.Name;
		                                        executeCommand(command, macros.SubjectName,
                                                    {
                                                        value: additionValue,
                                                        valueId: valueId,
                                                        columnName: columnName,
                                                        columnTypeCode: columnTypeCode
                                                    }
                                                );
		                                    }
		                                }, this);
		                                return;
		                            default:
		                                additionValue = macros.AdditionalParamValue;
		                                break;
		                        }
		                    }
		                    else if (additionValue && command !== "create") {
		                        tempList = hintList.filter(function (item) {
		                            return additionValue === item.AdditionalParamValue;
		                        });
		                        if (tempList.getCount() === 1) {
		                            var item = tempList.getItems()[0];
		                            valueId = item.AdditionalParamValueId;
		                            executeCommand(command, mainParam,
                                        {
                                            value: additionValue,
                                            valueId: valueId,
                                            columnName: columnName,
                                            columnTypeCode: columnTypeCode
                                        }
                                    );
		                            this.clearData();
		                            return;
		                        } else {
		                            subjectName = macros.SubjectName;
		                            if (command === "goto") {
		                                subjectName = subjectName + "Folder";
		                            }
		                            var viewModel = this;
		                            callServiceMethod(ajaxProvider, "GetHintList", function (response) {
		                                if (instance.isDestroyed) { return; }
		                                var hintArray = response.GetHintListResult;
		                                if (hintArray.length === 1) {
		                                    valueId = hintArray[0].Value;
		                                }
		                                executeCommand(command, mainParam,
                                            {
                                                value: additionValue,
                                                valueId: valueId,
                                                columnName: columnName,
                                                columnTypeCode: columnTypeCode
                                            }
                                        );
		                                viewModel.clearData();
		                            }, { "subjectName": subjectName, "hintText": additionValue });
		                            return;
		                        }
		                    }
		                    executeCommand(command, mainParam,
                                {
                                    value: additionValue,
                                    valueId: valueId,
                                    columnName: columnName,
                                    columnTypeCode: columnTypeCode
                                }
                            );
		                } else {
		                    var searchSchemaName = "Contact";
		                    var searchColumnName = "Name";
		                    if (currentSchemaName) {
		                        var tempCommandList = commandList.filter(function (item) {
		                            return (item.SubjectName === currentSchemaName);
		                        });
		                        if (tempCommandList.getCount() !== 0) {
		                            searchSchemaName = currentSchemaName;
		                            searchColumnName = tempCommandList.getItems()[0].ColumnName;
		                        }
		                    }
		                    executeCommand("search", searchSchemaName,
                                {
                                    value: input.trim(),
                                    valueId: "",
                                    columnName: searchColumnName,
                                    columnTypeCode: "",
                                    noSchema: true
                                }
                            );
		                }
		                this.clearData();
		            };
		            view.render(container);
		            view.bind(viewModel);
		            performanceCounterManager.setTimeStamp("loadAdditionalModulesComplete");
		        }
		        var instance = Ext.define("CommandLineModule", {
		            init: init,
		            render: render
		        });
		        return instance;
		    }

		    return createConstructor;
		});