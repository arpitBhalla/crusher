import { ActionsInTestEnum } from "@shared/constants/recordedActions";
import { iAction } from "@shared/types/action";
import { resolveToBackendPath, resolveToFrontEndPath } from "@shared/utils/url";
import axios from "axios";
import { shell } from "electron";
import { getBrowserActions, getMainActions } from "runner-utils/src";

class CloudCrusher {
	public static async getTest(testId: string, customBackendPath: string | undefined = undefined): Promise<Array<iAction>> {
		const testInfoResponse = await axios.get<{ events: Array<iAction> }>(resolveToBackendPath(`/tests/${testId}`, customBackendPath));
		const testSteps = testInfoResponse.data.events;

		return testSteps;
	}

	public static async getReplayableTestActions(
		actions: Array<iAction>,
		isMainTest: boolean,
		customBackendPath: string | undefined = undefined,
	): Promise<Array<iAction>> {
		const out = [];
		const browserActions: Array<iAction> = getBrowserActions(actions);
		if (isMainTest) {
			out.push(...browserActions);
		}
		const runAfterTest = browserActions.find((action) => action.type === ActionsInTestEnum.RUN_AFTER_TEST);
		if (runAfterTest) out.push(...(await this.getReplayableTestActions(await this.getTest(runAfterTest.payload.meta.value, customBackendPath), false)));

		const mainActions: Array<iAction> = getMainActions(actions);
		if (!isMainTest) {
			mainActions.map((action) => {
				return action;
			});
		}
		out.push(...mainActions);

		return out;
	}

	public static async updateTestName(testId: string, testName: string, userToken: string, customBackendPath: string | undefined = undefined) {
		return axios.post(resolveToBackendPath(`/tests/${testId}/actions/edit`, customBackendPath), {
			name: testName,
		}, {
			headers: {
				Cookie: `isLoggedIn=true; token=${userToken}`,
			},
		}).then((res) => res.data);
	}
	
	public static async runTests(testIds: Array<string> | null, projectId: string, userToken: string, customBackendPath: string | undefined = undefined) {
		return axios.post(resolveToBackendPath(`/projects/${projectId}/tests/actions/run`, customBackendPath), {
			testIds: Array.isArray(testIds) ? testIds.join(",") : null,
		}, {
			headers: {
				Cookie: `isLoggedIn=true; token=${userToken}`,
			},
		}).then((res) => res.data);
	}
	public static async saveTestDirectly(
		events: Array<iAction>,
		projectId: string,
		userToken: string,
		customBackendPath: string | undefined = undefined,
		customFrontEndPath: string | undefined = undefined,
		testName: string | null = null
	) {
		return axios
			.post(
				resolveToBackendPath("tests/actions/save.temp", customBackendPath),
				{ events: events },
				{
					headers: { Accept: "application/json, text/plain, */*", "Content-Type": "application/json", Authorization: `Bearer ${userToken}` },
				},
			)
			.then(async (result) => {
				return axios.post(
					resolveToBackendPath(`/projects/${projectId}/tests/actions/create`, customBackendPath),
					{
						tempTestId: result.data.insertId,
						name: testName ? testName : new Date().toDateString().substr(4, 6) + " " + new Date().toLocaleTimeString().substr(0, 10),
					},
					{
						headers: {
							Cookie: `isLoggedIn=true; token=${userToken}`,
						},
					},
				).then((res) => res.data);
			});
	}

	public static async getBuildReport(
		buildId: string,
		userToken: string,
		customBackendPath: string | undefined = undefined,
		customFrontEndPath: string | undefined = undefined,
	): Promise<any> {
		return axios.get(resolveToBackendPath(`/builds/${buildId}/report`, customBackendPath), {
			headers: {
				Cookie: `isLoggedIn=true; token=${userToken}`,
			},
		}).then((res) => res.data);
	}

	public static async saveTest(
		events: Array<iAction>,
		customBackendPath: string | undefined = undefined,
		customFrontEndPath: string | undefined = undefined,
		testName: string | null = null
	) {
		return axios
			.post(
				resolveToBackendPath("tests/actions/save.temp", customBackendPath),
				{
					events: events,
				},
				{
					headers: { Accept: "application/json, text/plain, */*", "Content-Type": "application/json" },
				},
			)
			.then(async (result) => {
				const url = new URL(resolveToFrontEndPath(`/?temp_test_id=${result.data.insertId}&temp_test_type=save`, customFrontEndPath));
				if(testName) {
					url.searchParams.set("temp_test_name", testName);
				}
				await shell.openExternal(url.toString());

				// @Note: window.open() instead of navigation though hyperlinks
				// hangs the electron app for some reason.
			});
	}

	public static async updateTestDirectly(
		events: Array<iAction>,
		testId: string,
		userToken: string,
		customBackendPath: string | undefined = undefined,
		customFrontEndPath: string | undefined = undefined
	) {
		return axios
			.post(
				resolveToBackendPath("tests/actions/save.temp", customBackendPath),
				{ events: events },
				{
					headers: { Accept: "application/json, text/plain, */*", "Content-Type": "application/json", Authorization: `Bearer ${userToken}` },
				},
			)
			.then(async (result) => {
				await axios.post(
					resolveToBackendPath(`/tests/${testId}/actions/update.steps`, customBackendPath),
					{
						tempTestId: result.data.insertId,
					},
					{
						headers: {
							Cookie: `isLoggedIn=true; token=${userToken}`,
						},
					},
				);
			});
	}

	public static async updateTest(
		events: Array<iAction>,
		testId: string,
		customBackendPath: string | undefined = undefined,
		customFrontEndPath: string | undefined = undefined,
	) {
		return axios
			.post(
				resolveToBackendPath("tests/actions/save.temp", customBackendPath),
				{ events: events },
				{
					headers: { Accept: "application/json, text/plain, */*", "Content-Type": "application/json" },
				},
			)
			.then(async (result) => {
				shell.openExternal(
					resolveToFrontEndPath(`/?temp_test_id=${result.data.insertId}&temp_test_type=update&update_test_id=${testId}`, customFrontEndPath),
				);

				// @Note: window.open() instead of navigation though hyperlinks
				// hangs the electron app for some reason.
			});
	}
}

export { CloudCrusher };
