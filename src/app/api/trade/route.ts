import { NextResponse } from 'next/server';
import { hyperliquidService } from '../../../services/hyperliquidService';
import { supabase } from '../../../lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { order, userId } = body;

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order details are required' },
        { status: 400 }
      );
    }

    // 1. Initiate trade using Hyperliquid SDK
    let tradeResult;
    try {
      tradeResult = await hyperliquidService.placeOrder(order);
    } catch (sdkError: any) {
      console.error('Hyperliquid SDK Error:', sdkError);
      return NextResponse.json(
        { success: false, error: sdkError.message || 'Failed to place order on Hyperliquid' },
        { status: 400 }
      );
    }

    // Check if the SDK returned an error response
    if (tradeResult && tradeResult.status === 'err') {
      return NextResponse.json(
        { success: false, error: tradeResult.response || 'Trade failed on exchange' },
        { status: 400 }
      );
    }

    // 2. Generate a unique ID for the trade
    const tradeId = crypto.randomUUID();

    // 3. Record trade info and unique ID in Supabase
    const tradeRecord = {
      id: tradeId,
      user_id: userId || null,
      order_details: order,
      trade_result: tradeResult,
      status: 'success',
      created_at: new Date().toISOString(),
    };

    const { error: dbError } = await supabase
      .from('trades')
      .insert([tradeRecord]);

    if (dbError) {
      console.error('Error recording trade to Supabase:', dbError);
      // We still return success for the trade itself, but include a warning
      return NextResponse.json({
        success: true,
        tradeId,
        result: tradeResult,
        warning: 'Trade succeeded but failed to record in database',
        dbError: dbError.message
      });
    }

    // 4. Return success to frontend
    return NextResponse.json({
      success: true,
      tradeId,
      result: tradeResult
    });

  } catch (error: any) {
    console.error('Trade API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred during the trade' },
      { status: 500 }
    );
  }
}
