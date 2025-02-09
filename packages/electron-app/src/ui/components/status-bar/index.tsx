import { ILoggerReducer } from "electron-app/src/store/reducers/logger";
import React from "react";
import { useSelector } from "react-redux";
import { css } from "@emotion/react";
import { Conditional } from "@dyson/components/layouts";
import { getLogs } from "electron-app/src/store/selectors/logger";
import { MiniCrossIcon, UpMaximiseIcon } from "../../icons";
import {ObjectInspector, TableInspector, chromeDark, ObjectRootLabel, ObjectLabel} from 'react-inspector';
import { BrowserButton } from "../buttons/browser.button";

function formatLogs(logs: Array<ILoggerReducer["logs"][0]>): Array<ILoggerReducer["logs"][0]> {
	logs = logs.map((log, index) => { return {...log, diff: index == 0 ? "0" : (log.time - logs[index - 1].time).toFixed(2)}});
	const noParentLogs = logs.filter((log: ILoggerReducer["logs"][0]) => !log.parent);
	return noParentLogs.map((log) => {
		return {...log, children: logs.filter((_log: ILoggerReducer["logs"][0]) => _log.parent === log.id)};
	})
}

interface ITabButtonProps {
	title: string;
	selected: boolean;
	count?: number;
	className?: string;
	callback?: any;
}
const TabButton = (props: ITabButtonProps) => {
	const {title, className, selected, callback, count} = props;

	return (
		<div className={className || ""} onClick={callback} css={[statusBarTabStyle, selected ? css`color: #8568D5;` : null]}>
			{title}
			<Conditional showIf={count != null}>
				<span className="ml-4" css={logsCountStyle}>{count}</span>
			</Conditional>
		</div>
	);
}

enum TabsEnum { 
	LOGS = "LOGS",
	CONTEXT = "CONTEXT",
	HOOKS = "HOOKS",
};

const SAMPLE_CONTEXT = {
	testId: 71,
	testName: "Booking flow",
	query: "Skip the line guided",
	parentTest: {
		id: 69,
		name: "Login",
	},
	userName: "Itisha Jain",
	userEmail: "itisha.mail@headout.com",
	userPhone: "9876543210",
};

const FIGMA_SAMPLE_CONTEXT = {
	"string": "this is a test ...",
	"integer": 42,
	"array": [1, 2, 3, "test", null],
	"float": 3.141592653589793,
	"undefined": undefined,
	"object": {
		"first-child": true,
		"second-child": false,
		"last-child": null,
	},
	"string_number": "1234",
};

const defaultNodeRenderer = ({ depth, name, data, isNonenumerable, expanded }) =>
  depth === 0
    ? <ObjectRootLabel name={name} data={data} />
    : <ObjectLabel name={name} data={data} isNonenumerable={isNonenumerable} />;
	
const StatusBar = (props: any) => {
	const [clicked, setClicked] = React.useState(false);
	const [selectedTab, setSelectedTab] = React.useState(TabsEnum.LOGS);
	const logsScrollRef: React.Ref<HTMLDivElement> = React.useRef(null);
	const logs = useSelector(getLogs);

	React.useEffect(() => {
		if(logs && logs.length) {
			const listContainer: any = document.querySelector("#logs-list");
			if(listContainer) {
				const elementHeight = listContainer.scrollHeight;
				listContainer.scrollBy(0, elementHeight);
			}
		}
	}, [logs]);

	const LogItem = (props: {log: ILoggerReducer["logs"][0] & {children: Array<ILoggerReducer["logs"][0]>; diff: string; }, diff: string; className?: string; }) => {
		const {log} = props;

		return (
			<div className={`${props.className}`}>
		<div css={css`padding-top: 16rem; display: flex;`}>
			<div>
				<span css={css`font-size: 14rem; color: ${log.type === "error" ? "#C2607D":  "#9FC370"}; font-family: Gilroy;`}>{log.type}</span>
				<span css={css`font-size: 14rem; color: #717171; font-family: Gilroy; word-break: break-all;`} className={"ml-20"}>{log.message}</span>
			</div>
			<div css={css`margin-left: auto;`}>
				<span css={css`color: #525252; font-size: 12.5rem; font-family: Gilroy;`}>+{props.diff} ms</span>
			</div>
		</div>
			<Conditional showIf={!!log.children && !!log.children.length}>
				{log.children && log.children.map((child: ILoggerReducer["logs"][0] & {children: Array<ILoggerReducer["logs"][0]>; diff: string; }) => {
					return <LogItem css={css`padding-left: 20rem;`} key={child.id} log={child} diff={child.diff}/>
				})}
			</Conditional>
		</div>
		)
	};

	const handleTabSelection = (tabType: TabsEnum) => {
		setSelectedTab(tabType);
	}

	const handleMaximiseClick = () => {
		setClicked(true);
	};

	const lastLogMessage = logs && logs.length ? logs[logs.length - 1].message : "";
	return (
	<>
		<div id={`logsTab`} className={`${clicked ? "expandBar" : ""}`} css={statusBarContainerStyle}>
			<div css={css`display: flex; align-items: center; height: 100%; max-height: 32rem; 	padding: 0rem 14rem;`}>
				<TabButton selected={selectedTab === TabsEnum.LOGS} title="Logs" count={logs && logs.length} callback={() => {setClicked(true); handleTabSelection(TabsEnum.LOGS); }}/>
	

				<Conditional showIf={!clicked}>
					<div css={logTextStyle} className={"ml-20"}>{lastLogMessage.length > 100 ? lastLogMessage.substr(0, 100) + "..." : lastLogMessage}</div>
					<UpMaximiseIcon onClick={handleMaximiseClick} css={css`width: 10rem; height: 12rem; margin-left: auto; :hover { opacity: 0.7 }`}/>
				</Conditional>

				<Conditional showIf={clicked}>
					<div css={css`margin-left: auto;`}>
						<div onClick={setClicked.bind(this, !clicked)} css={css`padding: 4rem 5rem; :hover { svg{ opacity: 0.7; } background: rgba(0, 0, 0, 0.2); opacity: 0.8; }`}>
							<MiniCrossIcon css={css`width: 10rem; height: 10rem; opacity: 0.44; `}/>
						</div>
					</div>
				</Conditional>
			</div>

			<Conditional showIf={clicked}>
				<Conditional showIf={selectedTab === TabsEnum.LOGS}>
					<div id={"logs-list"} css={css`color: #fff; font-size: 14rem; padding: 0rem 14rem; padding-bottom: 8rem; height: calc(100% - 32rem); overflow-y: auto;`} className={"custom-scroll"}>
						{logs && logs.length ? formatLogs(logs).map((log: ILoggerReducer["logs"][0], index: number) => {
							return <LogItem diff={log.diff} log={log} key={log.id}/>	
						}) : ""}
					</div>
				</Conditional>
				<Conditional showIf={selectedTab === TabsEnum.CONTEXT}>
					<div css={css`display: flex; flex-direction: column;`}>
					<div css={css`color: #fff; font-size: 14rem; padding: 0rem 16rem; padding-top: 12rem; padding-bottom: 8rem; height: calc(100% - 32rem); overflow-y: auto;`} className={"custom-scroll"}>
						<ObjectInspector
						expandLevel={99}
						// nodeRenderer={defaultNodeRenderer}
							theme={{
								...chromeDark,
								...({
									// OBJECT_VALUE_NUMBER_COLOR: "#47ad43",
									OBJECT_VALUE_STRING_COLOR: "rgb(227, 110, 236)",
									OBJECT_NAME_COLOR: "white",
									// OBJECT_VALUE_BOOLEAN_COLOR: "#f5be18",
									// OBJECT_VALUE_NULL_STYLE: {
									// 	background: "#303030",
									// 	color: "#f5be18",
									// 	textTransform: "uppercase",
									// 	fontWeight: "bold",
									// 	padding: "0.5rem 2rem",
									// },
									// ARROW_COLOR: '#499ffa',
									TREENODE_FONT_SIZE: "13.25rem",
									TREENODE_LINE_HEIGHT: "18rem",
									BASE_BACKGROUND_COLOR: 'linear-gradient(0deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.02)), #0F1010'
								})
							}}
							data={SAMPLE_CONTEXT} />
					</div>
					<BrowserButton size={"x-small"} css={css`background: #8860DE; margin-right: 18rem; padding: 0rem 16rem; border: .5px solid #8860DE; margin-left: auto;`}>Re-Run with custom context</BrowserButton>
					</div>
				</Conditional>
			</Conditional>
		</div> 

		<style>{`
			.expandBar {
				max-height: 341rem;
			}
		`}
		</style>
	</>
	)
};

const logTextStyle = css`
	color: #717171;
	font-size: 13.5rem;
	font-family: Gilroy;
`;
const logsCountStyle = css`
	background: rgba(196, 196, 196, 0.1);
	border-radius: 6rem;
	font-size: 12rem;
	font-family: Cera Pro;
	color: rgba(255,255,255,0.7);
	padding: 4rem 6rem;
`;

const statusBarTabStyle = css`
	font-size: 14rem;
	font-family: Cera Pro;
	color: rgba(255,255,255,0.7);

	:hover {
		opacity: 0.8;
	}
`;
const statusBarContainerStyle = css`
	background: linear-gradient(0deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.02)), #0F1010;
	border: 1px solid #272D2D;
	width: 100%;
    max-height: 32rem;
	height: 100%;
	position: absolute;
	bottom: 0rem;
	transition: max-height 0.1s;  
	z-index: 999;
`;

export { StatusBar };