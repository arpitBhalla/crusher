import React, { RefObject, useEffect, useRef } from "react";
import { css, Global } from "@emotion/react";
import { Conditional } from "@dyson/components/layouts";
import { Modal } from "@dyson/components/molecules/Modal";
import { ModalTopBar } from "../topBar";
import { Button } from "@dyson/components/atoms/button/Button";
import { deleteCodeTemplate, getCodeTemplates, performCustomCode, saveCodeTemplate, updateCodeTemplate } from "electron-app/src/ui/commands/perform";
import { iAction } from "@shared/types/action";
import { useSelector, useStore } from "react-redux";
import { setSelectedElement, updateRecordedStep } from "electron-app/src/store/actions/recorder";
import { sendSnackBarEvent } from "../../toast";
import { Checkbox } from "@dyson/components/atoms/checkbox/checkbox";
import { Input } from "@dyson/components/atoms";
import { SelectBox } from "@dyson/components/molecules/Select/Select";
import Editor, { Monaco } from "@monaco-editor/react";
import { loader } from "@monaco-editor/react";
import * as path from "path";
import * as fs from "fs";
import { ipcRenderer } from "electron";
import { Dropdown } from "@dyson/components/molecules/Dropdown";
import { DownIcon } from "electron-app/src/ui/icons";
import { monacoTheme } from "./monaco.theme";

function ensureFirstBackSlash(str) {
	return str.length > 0 && str.charAt(0) !== "/" ? "/" + str : str;
}

function uriFromPath(_path) {
	const pathName = path.resolve(_path).replace(/\\/g, "/");
	return encodeURI("file://" + ensureFirstBackSlash(pathName));
}

loader.config({
	paths: {
		vs: uriFromPath(path.join(__dirname, "static/monaco-editor/min/vs")),
	},
});

interface iElementCustomScriptModalContent {
	isOpen: boolean;
	handleClose: () => void;

	// For editing
	stepIndex?: number;
	stepAction?: iAction;
}

const DropdownOption = ({ label }) => {
	return <div css={{ padding: "7rem 8rem", width: "100%", cursor: "default" }}>{label}</div>;
};

function ActionButtonDropdown({ setShowActionMenu, callback, selectedTemplate, ...props }) {
	const MenuItem = ({ label, onClick, ...props }) => {
		return (
			<div
				css={css`
					padding: 8rem 12rem;
					:hover {
						background: #687ef2 !important;
					}
				`}
				onClick={onClick}
			>
				{label}
			</div>
		);
	};

	const handleDeteach = () => {
		setShowActionMenu(false);
		callback("detach");
		sendSnackBarEvent({ type: "success", message: "Detached from template" });
	};
	const handleSaveNewTemplate = () => {
		setShowActionMenu(false);
		callback("save-new-template");
	};

	const handleUpdateTemplate = () => {
		setShowActionMenu(false);
		callback("update-template");
		sendSnackBarEvent({ type: "success", message: "Updated template" });
	};

	return (
		<div
			className={"flex flex-col justify-between h-full"}
			css={css`
				font-size: 13rem;
				color: #fff;
			`}
		>
			<div>
				<Conditional showIf={selectedTemplate}> 
					<MenuItem onClick={handleDeteach} label={"Detach template"} className={"close-on-click"} />
					<MenuItem onClick={handleUpdateTemplate} label={"Update template"} className={"close-on-click"} />
				</Conditional>
				<MenuItem onClick={handleSaveNewTemplate} label={"Save new template"} className={"close-on-click"} />
			</div>
		</div>
	);
}

const initialCodeTemplate = `/* Write your custom code here. For more infromation
checkout SDK docs here at, https://docs.crusher.dev/sdk */
async function validate() {

}`;
const CustomCodeModal = (props: iElementCustomScriptModalContent) => {
	const { isOpen } = props;
	const store = useStore();
	const [codeTemplates, setCodeTemplates] = React.useState([]);
	const [selectedTemplate, setSelectedTemplate] = React.useState(null);
	const [savingTemplateState, setSavingTemplateState] = React.useState({ state: "input" });
	const [needName, setNeedName] = React.useState(false);
	const [modalName, setModalName] = React.useState("ts:modal.ts");
	const [showActionMenu, setShowActionMenu] = React.useState(false);

	const monacoRef: React.Ref<Monaco> = React.useRef(null);
	const editorRef = React.useRef(null);

	const codeTextAreaRef = useRef(null as null | HTMLTextAreaElement);

	React.useEffect(() => {
		if (isOpen) {
			setCodeTemplates([]);
			setSelectedTemplate(null);
			const action = props.stepAction;
			setSavingTemplateState({ state: "input" });
			setNeedName(false);
			getCodeTemplates().then((res) => {
				const templatesArr = res.map((a) => ({ id: a.id, code: a.code, name: a.name }));
				setCodeTemplates(templatesArr);

		
			});
		}
	}, [isOpen]);

	const runCustomCode = React.useCallback(() => {
		performCustomCode(monacoRef.current.editor.getModel(modalName).getValue(), selectedTemplate);
		props.handleClose();
	}, [selectedTemplate, codeTextAreaRef]);

	const updateCustomCode = React.useCallback(() => {
		if (props.stepAction) {
			props.stepAction.payload.meta.script = monacoRef.current.editor.getModel(modalName).getValue();
			props.stepAction.payload.meta.templateId = selectedTemplate;
			store.dispatch(updateRecordedStep({ ...props.stepAction }, props.stepIndex));
			sendSnackBarEvent({ type: "success", message: "Custom code updated" });
			props.handleClose();
		}
	}, [props.stepAction, selectedTemplate, codeTextAreaRef]);

	const isThereScriptOutput = true;

	const isThereScriptError = false;

	const handleSaveAsTemplate = async () => {
		setNeedName(true);
		setTimeout(() => {
			document.querySelector("#template-name-input")?.focus();
		}, 5);
	};

	const handleUpdateTemplate = async () => {
		if (selectedTemplate) {
			const templateRecord = codeTemplates.find((a) => a.id === selectedTemplate);
			await updateCodeTemplate(selectedTemplate, templateRecord.name, monacoRef.current.editor.getModel(modalName).getValue());
			templateRecord.code = monacoRef.current.editor.getModel(modalName).getValue();
			setCodeTemplates([...codeTemplates]);
			sendSnackBarEvent({ type: "success", message: "Custom code template updated" });
		}
	};

	const handleDetach = async () => {
		if(selectedTemplate) {
			setSelectedTemplate(null);
			sendSnackBarEvent({ type: "success", message: "Detached from template. Just click on Save to continue..." });
		}
	}

	const handleDeleteTemplate = async () => {
		if (selectedTemplate) {
			await deleteCodeTemplate(selectedTemplate);
			setCodeTemplates([...codeTemplates.filter((a) => a.id !== selectedTemplate)]);
			setSelectedTemplate(null);
			sendSnackBarEvent({ type: "success", message: "Custom code template deleted" });
		}
	};

	const transformListToSelectBoxValues = (codeTemplates) => {
		return codeTemplates.map((test) => ({
			value: test.id,
			label: test.name,
			component: <DropdownOption label={test.name} />,
		}));
	};

	if (!isOpen) return null;

	const getSelectedOption = (arr, id) => {
		return arr.find((a) => a.value === id);
	};

	const handleOnMount = (editor: any, monaco: Monaco) => {
		if (props.stepAction) {
			editor.getModel(modalName).setValue(props.stepAction.payload.meta.script);

			getCodeTemplates().then((res) => {
				const templatesArr = res.map((a) => ({ id: a.id, code: a.code, name: a.name }));
				setCodeTemplates(templatesArr);
				console.log("Step action is", props.stepAction);
				const template = props.stepAction && props.stepAction.payload.meta.templateId ? templatesArr.find((a) => props.stepAction && a.id === props.stepAction.payload.meta.templateId) : null;
				if(template) {
					setSelectedTemplate(template.id);
				}
			});
		}
	};
	const handleEditorWillMount = (monaco: Monaco) => {
		monacoRef.current = monaco;

		monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
			target: monaco.languages.typescript.ScriptTarget.ESNext,
			module: monaco.languages.typescript.ModuleKind.ESNext,
			allowSyntheticDefaultImports: true,
			allowNonTsExtensions: true,
		});

		const libUri = "ts:filename/sdk.d.ts";
		let types = fs.readFileSync(path.resolve(__dirname, "static/types.txt"), "utf8");
		const ctx = ipcRenderer.sendSync("get-var-context");
		types += `\n declare const ctx: { ${Object.keys(ctx)
			.map((a) => {
				return `${a}: ${ctx[a]};`;
			})
			.join("")} | any };`;
		monaco.languages.typescript.javascriptDefaults.addExtraLib(types, libUri);

		monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
			diagnosticCodesToIgnore: [1375],
		});
		monaco.editor.defineTheme("my-theme", {
			base: "vs-dark",
			inherit: true,
			rules: [...monacoTheme.rules],
			colors: {
				...monacoTheme.colors,
				"editor.background": "#080809",
			},
		});
	};

	const handleCreateTemplate = (name) => {
		if (!name || !name.length) {
			sendSnackBarEvent({ type: "error", message: "Error: Enter some name for the template" });
			return;
		}
		const currentCode = monacoRef.current.editor.getModel(modalName).getValue();
		saveCodeTemplate({ name: name, code: currentCode })
			.then((res) => {
				setCodeTemplates([...codeTemplates, { id: res.id, code: res.code, name: res.name }]);
				setSelectedTemplate(res.id);
				setNeedName(false);
				setSavingTemplateState({ state: "saved" });
				sendSnackBarEvent({ type: "success", message: "Template saved" });
			})
			.catch((err) => {
				sendSnackBarEvent({ type: "error", message: "Error template saved" });
			});
	};

	return (
		<Modal modalStyle={modalStyle} onOutsideClick={props.handleClose}>
			<ModalTopBar css={css`padding-bottom: 12rem;`} title={<><span>Custom code</span><div css={css`font-size: 13rem;
    font-family: 'Cera Pro';
    display: flex;
    color: rgba(255, 255, 255, 0.4);
    align-items: center;
    padding-top: 1rem;
    margin-left: 14rem;`}>Read docs</div></>} closeModal={props.handleClose} />
			<div
				css={css`
					padding: 8rem 34rem;
					display: flex;
					border-bottom: 0.25px solid rgb(255,255,255,0.08);
					padding-bottom: 17rem;
				`}
			>
				<SelectBox
					isSearchable={true}
					dropDownHeight={"auto"}
					css={css`
						font-family: Gilroy;
						input {
							outline: none;
							width: 80%;
						}
						.selectBox {
							height: 34rem;
						}

						.selectBox__value {
							margin-right: 10rem;
							font-size: 13rem;
						}
						width: 250rem;
					`}
					placeholder={"Select a template"}
					size={"large"}
					selected={selectedTemplate ? [getSelectedOption(transformListToSelectBoxValues(codeTemplates), selectedTemplate)] : undefined}
					values={transformListToSelectBoxValues(codeTemplates)}
					callback={(selectedValue) => {
						const value = selectedValue[0];
						setSelectedTemplate(selectedValue[0]);
						const codeTemplate = codeTemplates.find((item) => item.id === value);
						monacoRef.current.editor.getModel(modalName).setValue(codeTemplate.code);
					}}
				/>

<Global
      styles={css`
	  .select-dropDownContainer {
		max-height: 200rem;
		overflow-y: scroll !important;
		::-webkit-scrollbar {
			background: transparent;
			width: 8rem;
		}
		::-webkit-scrollbar-thumb {
			background: white;
			border-radius: 14rem;
		}
	}

	.dropdown-box .dropdown-label {
		padding-top: 2rem !important;
		padding-bottom: 2rem !important;
	}
      `}
    />
				<Conditional showIf={selectedTemplate}>
					<div
						onClick={handleDeleteTemplate}
						css={css`
							align-self: center;
							margin-left: 20rem;
							font-size: 14rem;
							color: #fff;
							:hover {
								opacity: 0.8;
							}
						`}
					>
						Delete
					</div>
				</Conditional>
			</div>
			<div css={css`
					padding: 12rem 34rem;
					background: #080809;
					padding-left: 4rem;
					border-bottom-left-radius: 12px;
					border-bottom-right-radius: 12px;`}>
				<Editor
					path={"ts:modal.ts"}
					height="300rem"
					defaultLanguage="javascript"
					beforeMount={handleEditorWillMount}
					onMount={handleOnMount}
					theme={"my-theme"}
					options={{ minimap: { enabled: false } }}
					defaultValue={initialCodeTemplate}
				/>

<Conditional showIf={needName}>
				<div css={css`
				    display: flex;
					align-items: center;
					margin-top: 10rem;
					margin-bottom: 12rem;
				`}>
					<div
						css={css`
							display: flex;
							align-items: center;
						`}
					>
						<Input
							id="template-name-input"
							css={[
								inputStyle,
								css`
									margin-left: auto;
									min-width: 118rem;
								`,
							]}
							placeholder={"Enter template name"}
							pattern="[0-9]*"
							size={"medium"}
							onReturn={handleCreateTemplate}
						/>
							<Button
						css={[
							saveButtonStyle,
							css`
								width: 118rem;
								border-right-width: 6rem;
								border-top-right-radius: 6rem;
								border-bottom-right-radius: 6rem;
								margin-left: 18rem;
								height: 34rem;
							`,
						]}
						onClick={() => {
							const name = (document.querySelector("#template-name-input") as HTMLInputElement).value;
							handleCreateTemplate(name);
						}}
					>
						{"Create"}
					</Button>
					</div>
				
				</div>
			</Conditional>
				<div css={bottomBarStyle}>
					<Dropdown
				initialState={showActionMenu}
				component={<ActionButtonDropdown callback={(method) => {
					if(method === "save-new-template") {
						handleSaveAsTemplate();
					} else if(method === "detach") {
						handleDetach();
					} else if(method === "update-template") {
						handleUpdateTemplate();
					}
				}} selectedTemplate={selectedTemplate} setShowActionMenu={setShowActionMenu.bind(this)} />}
				callback={setShowActionMenu.bind(this)}
				css={css`margin-top: 16rem;`}
				dropdownCSS={css`
					left: 0rem !important;
					width: 162rem;
				`}
			>
					<Button css={saveButtonStyle} onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							if(props.stepAction) {
								updateCustomCode();
							} else {
								runCustomCode();
							}
						}}>
						{props.stepAction ? (selectedTemplate ? "Save step" : "Save step") : "Add step"}
					</Button>
					<div
					css={css`
						background: #9461ff;
						display: flex;
						align-items: center;
						padding: 0rem 9rem;
						border-top-right-radius: 6rem;
						border-bottom-right-radius: 6rem;
						border-left-color: #00000036;
						border-left-width: 2.5rem;
						border-left-style: solid;
						:hover {
							opacity: 0.8;
						}
					`}
				>
					<DownIcon
						fill={"#fff"}
						css={css`
							width: 9rem;
						`}
					/>
				</div>
					</Dropdown>
				</div>
			</div>
		</Modal>
	);
};

const inputStyle = css`
	background: #1a1a1c;
	border-radius: 6rem;
	border: 1rem solid #43434f;
	font-family: Gilroy;
	font-size: 14rem;
	min-width: 358rem;
	color: #fff;
	outline: none;
`;

const modalStyle = css`
	width: 800rem;
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -20%);
	display: flex;
	flex-direction: column;
	padding: 0rem;
	background: linear-gradient(0deg, rgba(0, 0, 0, 0.42), rgba(0, 0, 0, 0.42)), #111213;
`;

const containerCSS = css`
	padding-top: 1rem;
	position: relative;
`;
const validationStatusContainerCSS = css`
	position: absolute;
	right: 0.75rem;
	top: 1.5rem;
`;
const bottomBarStyle = css`
	display: flex;
	justify-content: flex-end;
	align-items: center;
	margin-top: 1.5rem;
`;
const saveButtonStyle = css`
	width: 128rem;
	height: 30rem;
	background: linear-gradient(0deg, #9462ff, #9462ff);
	border-radius: 6rem;
	font-family: Gilroy;
	font-style: normal;
	font-weight: normal;
	font-size: 14rem;
	line-height: 17rem;
	border: 0.5px solid transparent;
	border-right-width: 0rem;
	border-top-right-radius: 0rem;
	border-bottom-right-radius: 0rem;
	color: #ffffff;
	:hover {
		border: 0.5px solid #8860de;
		border-right-width: 0rem;
		border-top-right-radius: 0rem;
		border-bottom-right-radius: 0rem;
	}
`;

export { CustomCodeModal };
