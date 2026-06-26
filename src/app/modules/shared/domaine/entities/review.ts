
export interface IReview {
    id?: string;
    rate: number;
    comment?: string;
    user_name?: string;
    user_id?: string;
    user_arts?: string[];
    created_at?: Date;
}