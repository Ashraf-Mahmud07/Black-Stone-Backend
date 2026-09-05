export interface IClaimMail {
	name: string;
	mobile: string;
	actual_amount: number;
	due_amount: number;
	reference: string;
	investment_type: 'ips' | 'share';
}
